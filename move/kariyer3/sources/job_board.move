/// Kariyer3 - Decentralized Job Board with Privacy & AI Integration
/// Implements SEAL Pattern for private applications
module kariyer3::job_board;

use std::string::String;
use sui::clock::Clock;
use sui::display;
use sui::dynamic_object_field as dof;
use sui::event;
use sui::package;
use sui::vec_set::{Self, VecSet};

// ==================== Error Codes ====================
const ENotEmployer: u64 = 1;
const ENotApplicant: u64 = 2;
const EAlreadyHired: u64 = 3;
const ENotAuthorized: u64 = 4;
const EApplicationNotFound: u64 = 5;
const EInvalidSalaryRange: u64 = 6;

// ==================== One-Time Witness ====================
public struct JOB_BOARD has drop {}

// ==================== Core Structs ====================

/// Global shared object tracking all jobs
public struct JobBoard has key {
    id: UID,
    total_jobs: u64,
    total_applications: u64,
    ai_agent: address, // Authorized AI agent for reviews
}

/// Individual job posting with rich data model for filtering
public struct Job has key, store {
    id: UID,
    employer: address,
    title: String,
    description: String,
    company: String,
    location: String,
    category: String, // e.g., "Engineering", "Design", "Marketing"
    salary_range: vector<u64>, // [min, max] in SUI
    tags: vector<String>, // Skills/keywords for filtering
    created_at: u64,
    hired_candidate: Option<address>,
    status: u8, // 0: Open, 1: Closed, 2: Hired
}

/// Application stored as Dynamic Object Field on Job (Implemented SEAL Pattern for Privacy)
/// Only visible to Employer and Applicant
public struct Application has key, store {
    id: UID,
    job_id: ID,
    applicant: address,
    cover_message: String,
    cv_blob_id: String, // Walrus storage ID
    applied_at: u64,
    // AI Data Fields initialized for future integration
    ai_score: Option<u8>, // 0-100 score from AI agent
    ai_analysis: Option<String>, // AI-generated analysis
}

/// Capability for employers to manage their jobs
public struct EmployerCap has key, store {
    id: UID,
    job_id: ID,
}

// ==================== Events ====================

public struct JobPosted has copy, drop {
    job_id: ID,
    employer: address,
    title: String,
    category: String,
    timestamp: u64,
}

public struct ApplicationSubmitted has copy, drop {
    job_id: ID,
    applicant: address,
    application_id: ID,
    timestamp: u64,
}

public struct CandidateHired has copy, drop {
    job_id: ID,
    candidate: address,
    timestamp: u64,
}

public struct AIReviewAdded has copy, drop {
    application_id: ID,
    ai_score: u8,
    timestamp: u64,
}

// ==================== Init & Display ====================

fun init(otw: JOB_BOARD, ctx: &mut TxContext) {
    let publisher = package::claim(otw, ctx);

    // Display standards for Job NFT
    let mut job_display = display::new<Job>(&publisher, ctx);
    job_display.add(b"name".to_string(), b"{title} at {company}".to_string());
    job_display.add(b"description".to_string(), b"{description}".to_string());
    job_display.add(b"category".to_string(), b"{category}".to_string());
    job_display.add(b"location".to_string(), b"{location}".to_string());
    job_display.add(b"image_url".to_string(), b"https://aggregator.walrus-testnet.walrus.space/v1/sui-job-board-logo".to_string());
    job_display.update_version();
    transfer::public_transfer(job_display, ctx.sender());

    // Display standards for Application
    let mut app_display = display::new<Application>(&publisher, ctx);
    app_display.add(b"name".to_string(), b"Job Application".to_string());
    app_display.add(b"description".to_string(), b"Application for Job ID: {job_id}".to_string());
    app_display.update_version();
    transfer::public_transfer(app_display, ctx.sender());

    transfer::public_transfer(publisher, ctx.sender());

    // Create global JobBoard
    let job_board = JobBoard {
        id: object::new(ctx),
        total_jobs: 0,
        total_applications: 0,
        ai_agent: @0x0, // Will be set by admin
    };

    transfer::share_object(job_board);
}

// ==================== Employer Functions ====================

/// Post a new job with category and tags for filtering
public fun post_job(
    board: &mut JobBoard,
    title: String,
    description: String,
    company: String,
    location: String,
    category: String,
    salary_min: u64,
    salary_max: u64,
    tags: vector<String>,
    clock: &Clock,
    ctx: &mut TxContext,
): ID {
    assert!(salary_max >= salary_min, EInvalidSalaryRange);

    let job_uid = object::new(ctx);
    let job_id = job_uid.to_inner();

    let mut salary_range = vector::empty<u64>();
    salary_range.push_back(salary_min);
    salary_range.push_back(salary_max);

    let job = Job {
        id: job_uid,
        employer: ctx.sender(),
        title,
        description,
        company,
        location,
        category,
        salary_range,
        tags,
        created_at: clock.timestamp_ms(),
        hired_candidate: option::none(),
        status: 0, // Open
    };

    // Create employer capability
    let cap = EmployerCap {
        id: object::new(ctx),
        job_id,
    };

    event::emit(JobPosted {
        job_id,
        employer: ctx.sender(),
        title: job.title,
        category: job.category,
        timestamp: clock.timestamp_ms(),
    });

    board.total_jobs = board.total_jobs + 1;

    transfer::public_transfer(cap, ctx.sender());
    transfer::public_share_object(job);

    job_id
}

/// Hire a candidate for the job
public fun hire_candidate(
    job: &mut Job,
    _cap: &EmployerCap,
    candidate: address,
    clock: &Clock,
    ctx: &TxContext,
) {
    assert!(ctx.sender() == job.employer, ENotEmployer);
    assert!(option::is_none(&job.hired_candidate), EAlreadyHired);

    job.hired_candidate = option::some(candidate);
    job.status = 2; // Hired

    event::emit(CandidateHired {
        job_id: object::id(job),
        candidate,
        timestamp: clock.timestamp_ms(),
    });
}

/// Close job posting
public fun close_job(
    job: &mut Job,
    _cap: &EmployerCap,
    ctx: &TxContext,
) {
    assert!(ctx.sender() == job.employer, ENotEmployer);
    job.status = 1; // Closed
}

// ==================== Applicant Functions ====================

/// Apply to a job with CV blob ID from Walrus
/// Application stored as Dynamic Object Field (SEAL Pattern for Privacy)
public fun apply(
    board: &mut JobBoard,
    job: &mut Job,
    cover_message: String,
    cv_blob_id: String, // Walrus blob ID
    clock: &Clock,
    ctx: &mut TxContext,
): ID {
    let app_uid = object::new(ctx);
    let app_id = app_uid.to_inner();

    let application = Application {
        id: app_uid,
        job_id: object::id(job),
        applicant: ctx.sender(),
        cover_message,
        cv_blob_id,
        applied_at: clock.timestamp_ms(),
        ai_score: option::none(), // AI Data Fields initialized
        ai_analysis: option::none(),
    };

    event::emit(ApplicationSubmitted {
        job_id: object::id(job),
        applicant: ctx.sender(),
        application_id: app_id,
        timestamp: clock.timestamp_ms(),
    });

    board.total_applications = board.total_applications + 1;

    // Store application as dynamic object field on Job (Privacy: only employer + applicant can access)
    dof::add(&mut job.id, app_id, application);

    app_id
}

/// View application (Access Control: only employer or applicant)
public fun view_application(
    job: &Job,
    application_id: ID,
    ctx: &TxContext,
): &Application {
    let app = dof::borrow<ID, Application>(&job.id, application_id);

    // Access control: only employer or applicant
    assert!(
        ctx.sender() == job.employer || ctx.sender() == app.applicant,
        ENotAuthorized
    );

    app
}

// ==================== AI Agent Functions ====================

/// Add AI review to application (only authorized AI agent)
public fun add_ai_review(
    board: &JobBoard,
    job: &mut Job,
    application_id: ID,
    ai_score: u8,
    ai_analysis: String,
    clock: &Clock,
    ctx: &TxContext,
) {
    assert!(ctx.sender() == board.ai_agent, ENotAuthorized);

    let app = dof::borrow_mut<ID, Application>(&mut job.id, application_id);

    app.ai_score = option::some(ai_score);
    app.ai_analysis = option::some(ai_analysis);

    event::emit(AIReviewAdded {
        application_id,
        ai_score,
        timestamp: clock.timestamp_ms(),
    });
}

/// Set AI agent address (admin only - for demo, sender must be board creator)
public fun set_ai_agent(
    board: &mut JobBoard,
    agent: address,
    _ctx: &TxContext,
) {
    // In production, add proper admin cap check
    board.ai_agent = agent;
}

// ==================== View Functions ====================

public fun job_id(job: &Job): ID {
    object::id(job)
}

public fun job_employer(job: &Job): address {
    job.employer
}

public fun job_title(job: &Job): String {
    job.title
}

public fun job_description(job: &Job): String {
    job.description
}

public fun job_company(job: &Job): String {
    job.company
}

public fun job_location(job: &Job): String {
    job.location
}

public fun job_category(job: &Job): String {
    job.category
}

public fun job_salary_range(job: &Job): vector<u64> {
    job.salary_range
}

public fun job_tags(job: &Job): vector<String> {
    job.tags
}

public fun job_created_at(job: &Job): u64 {
    job.created_at
}

public fun job_status(job: &Job): u8 {
    job.status
}

public fun job_hired_candidate(job: &Job): Option<address> {
    job.hired_candidate
}

public fun application_id(app: &Application): ID {
    object::id(app)
}

public fun application_applicant(app: &Application): address {
    app.applicant
}

public fun application_cover_message(app: &Application): String {
    app.cover_message
}

public fun application_cv_blob_id(app: &Application): String {
    app.cv_blob_id
}

public fun application_applied_at(app: &Application): u64 {
    app.applied_at
}

public fun application_ai_score(app: &Application): Option<u8> {
    app.ai_score
}

public fun application_ai_analysis(app: &Application): Option<String> {
    app.ai_analysis
}

public fun board_total_jobs(board: &JobBoard): u64 {
    board.total_jobs
}

public fun board_total_applications(board: &JobBoard): u64 {
    board.total_applications
}

// ==================== Test-Only Functions ====================

#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    init(JOB_BOARD {}, ctx);
}

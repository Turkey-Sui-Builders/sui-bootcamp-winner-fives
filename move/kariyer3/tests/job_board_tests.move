#[test_only]
module kariyer3::job_board_tests;

use kariyer3::job_board::{Self, JobBoard, Job, EmployerCap};
use sui::test_scenario::{Self as ts, Scenario};
use sui::clock::{Self, Clock};
use std::string;

const EMPLOYER: address = @0xA;
const APPLICANT1: address = @0xB;
const APPLICANT2: address = @0xC;
const AI_AGENT: address = @0xD;

fun setup_test(): Scenario {
    let mut scenario = ts::begin(@0x0);

    // Initialize module
    {
        job_board::init_for_testing(scenario.ctx());
    };

    scenario.next_tx(@0x0);

    // Create clock
    {
        clock::share_for_testing(clock::create_for_testing(scenario.ctx()));
    };

    scenario
}

#[test]
fun test_post_job() {
    let mut scenario = setup_test();

    scenario.next_tx(EMPLOYER);

    {
        let mut board = scenario.take_shared<JobBoard>();
        let clock = scenario.take_shared<Clock>();

        let mut tags = vector::empty<string::String>();
        tags.push_back(b"Rust".to_string());
        tags.push_back(b"Blockchain".to_string());

        let job_id = job_board::post_job(
            &mut board,
            b"Senior Blockchain Engineer".to_string(),
            b"Build the future of DeFi on Sui".to_string(),
            b"Kariyer3 Labs".to_string(),
            b"Remote".to_string(),
            b"Engineering".to_string(),
            50000,
            100000,
            tags,
            &clock,
            scenario.ctx(),
        );

        assert!(job_board::board_total_jobs(&board) == 1);

        ts::return_shared(board);
        ts::return_shared(clock);
    };

    // Check employer cap received
    scenario.next_tx(EMPLOYER);
    {
        let cap = scenario.take_from_sender<EmployerCap>();
        scenario.return_to_sender(cap);
    };

    scenario.end();
}

#[test]
fun test_apply_to_job() {
    let mut scenario = setup_test();

    // Post job
    scenario.next_tx(EMPLOYER);
    let job_id = {
        let mut board = scenario.take_shared<JobBoard>();
        let clock = scenario.take_shared<Clock>();

        let mut tags = vector::empty<string::String>();
        tags.push_back(b"Move".to_string());

        let id = job_board::post_job(
            &mut board,
            b"Move Developer".to_string(),
            b"Write smart contracts".to_string(),
            b"Sui Foundation".to_string(),
            b"San Francisco".to_string(),
            b"Engineering".to_string(),
            60000,
            120000,
            tags,
            &clock,
            scenario.ctx(),
        );

        ts::return_shared(board);
        ts::return_shared(clock);
        id
    };

    // Apply
    scenario.next_tx(APPLICANT1);
    {
        let mut board = scenario.take_shared<JobBoard>();
        let mut job = scenario.take_shared_by_id<Job>(job_id);
        let clock = scenario.take_shared<Clock>();

        let _app_id = job_board::apply(
            &mut board,
            &mut job,
            b"I am a passionate Move developer".to_string(),
            b"walrus_blob_123abc".to_string(),
            &clock,
            scenario.ctx(),
        );

        assert!(job_board::board_total_applications(&board) == 1);

        ts::return_shared(board);
        ts::return_shared(job);
        ts::return_shared(clock);
    };

    scenario.end();
}

#[test]
fun test_hire_candidate() {
    let mut scenario = setup_test();

    // Post job
    scenario.next_tx(EMPLOYER);
    let job_id = {
        let mut board = scenario.take_shared<JobBoard>();
        let clock = scenario.take_shared<Clock>();

        let mut tags = vector::empty<string::String>();
        tags.push_back(b"DeFi".to_string());

        let id = job_board::post_job(
            &mut board,
            b"DeFi Protocol Engineer".to_string(),
            b"Build innovative DeFi products".to_string(),
            b"DeepBook".to_string(),
            b"Remote".to_string(),
            b"Engineering".to_string(),
            80000,
            150000,
            tags,
            &clock,
            scenario.ctx(),
        );

        ts::return_shared(board);
        ts::return_shared(clock);
        id
    };

    // Apply
    scenario.next_tx(APPLICANT1);
    {
        let mut board = scenario.take_shared<JobBoard>();
        let mut job = scenario.take_shared_by_id<Job>(job_id);
        let clock = scenario.take_shared<Clock>();

        job_board::apply(
            &mut board,
            &mut job,
            b"Experienced in DeFi protocols".to_string(),
            b"walrus_blob_456def".to_string(),
            &clock,
            scenario.ctx(),
        );

        ts::return_shared(board);
        ts::return_shared(job);
        ts::return_shared(clock);
    };

    // Hire
    scenario.next_tx(EMPLOYER);
    {
        let mut job = scenario.take_shared_by_id<Job>(job_id);
        let cap = scenario.take_from_sender<EmployerCap>();
        let clock = scenario.take_shared<Clock>();

        job_board::hire_candidate(
            &mut job,
            &cap,
            APPLICANT1,
            &clock,
            scenario.ctx(),
        );

        assert!(option::is_some(&job_board::job_hired_candidate(&job)));
        assert!(job_board::job_status(&job) == 2);

        scenario.return_to_sender(cap);
        ts::return_shared(job);
        ts::return_shared(clock);
    };

    scenario.end();
}

#[test]
fun test_ai_review() {
    let mut scenario = setup_test();

    // Post job
    scenario.next_tx(EMPLOYER);
    let job_id = {
        let mut board = scenario.take_shared<JobBoard>();
        let clock = scenario.take_shared<Clock>();

        let mut tags = vector::empty<string::String>();
        tags.push_back(b"AI".to_string());

        let id = job_board::post_job(
            &mut board,
            b"AI Engineer".to_string(),
            b"Build AI integrations".to_string(),
            b"Kariyer3".to_string(),
            b"Istanbul".to_string(),
            b"Engineering".to_string(),
            70000,
            130000,
            tags,
            &clock,
            scenario.ctx(),
        );

        ts::return_shared(board);
        ts::return_shared(clock);
        id
    };

    // Apply
    scenario.next_tx(APPLICANT1);
    let app_id = {
        let mut board = scenario.take_shared<JobBoard>();
        let mut job = scenario.take_shared_by_id<Job>(job_id);
        let clock = scenario.take_shared<Clock>();

        let id = job_board::apply(
            &mut board,
            &mut job,
            b"AI expert with 5 years experience".to_string(),
            b"walrus_blob_789ghi".to_string(),
            &clock,
            scenario.ctx(),
        );

        ts::return_shared(board);
        ts::return_shared(job);
        ts::return_shared(clock);
        id
    };

    // Set AI agent
    scenario.next_tx(@0x0);
    {
        let mut board = scenario.take_shared<JobBoard>();
        job_board::set_ai_agent(&mut board, AI_AGENT, scenario.ctx());
        ts::return_shared(board);
    };

    // AI review
    scenario.next_tx(AI_AGENT);
    {
        let board = scenario.take_shared<JobBoard>();
        let mut job = scenario.take_shared_by_id<Job>(job_id);
        let clock = scenario.take_shared<Clock>();

        job_board::add_ai_review(
            &board,
            &mut job,
            app_id,
            85,
            b"Strong candidate with relevant experience".to_string(),
            &clock,
            scenario.ctx(),
        );

        ts::return_shared(board);
        ts::return_shared(job);
        ts::return_shared(clock);
    };

    // Verify AI review
    scenario.next_tx(EMPLOYER);
    {
        let job = scenario.take_shared_by_id<Job>(job_id);
        let app = job_board::view_application(&job, app_id, scenario.ctx());

        assert!(option::is_some(&job_board::application_ai_score(app)));
        assert!(*option::borrow(&job_board::application_ai_score(app)) == 85);

        ts::return_shared(job);
    };

    scenario.end();
}

#[test]
#[expected_failure(abort_code = job_board::ENotAuthorized)]
fun test_unauthorized_view_application() {
    let mut scenario = setup_test();

    // Post job
    scenario.next_tx(EMPLOYER);
    let job_id = {
        let mut board = scenario.take_shared<JobBoard>();
        let clock = scenario.take_shared<Clock>();

        let mut tags = vector::empty<string::String>();
        tags.push_back(b"Test".to_string());

        let id = job_board::post_job(
            &mut board,
            b"Test Job".to_string(),
            b"Test Description".to_string(),
            b"Test Company".to_string(),
            b"Test Location".to_string(),
            b"Test".to_string(),
            50000,
            100000,
            tags,
            &clock,
            scenario.ctx(),
        );

        ts::return_shared(board);
        ts::return_shared(clock);
        id
    };

    // Apply
    scenario.next_tx(APPLICANT1);
    let app_id = {
        let mut board = scenario.take_shared<JobBoard>();
        let mut job = scenario.take_shared_by_id<Job>(job_id);
        let clock = scenario.take_shared<Clock>();

        let id = job_board::apply(
            &mut board,
            &mut job,
            b"Test Cover".to_string(),
            b"test_blob".to_string(),
            &clock,
            scenario.ctx(),
        );

        ts::return_shared(board);
        ts::return_shared(job);
        ts::return_shared(clock);
        id
    };

    // Unauthorized access attempt
    scenario.next_tx(APPLICANT2);
    {
        let job = scenario.take_shared_by_id<Job>(job_id);
        let _app = job_board::view_application(&job, app_id, scenario.ctx()); // Should abort
        ts::return_shared(job);
    };

    scenario.end();
}

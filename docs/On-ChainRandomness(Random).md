# On-Chain Randomness

URL: https://docs.sui.io/guides/developer/advanced/randomness-onchain

Generating pseudo-random values in Move is similar to solutions in other languages. A Move function can create a new instance of `RandomGenerator` and use it for generating random values of different types, for example, `generate_u128(&mut generator), generate_u8_in_range(&mut generator, 1, 6)` , or,

```move
entry fun roll_dice(r: &Random, ctx: &mut TxContext): Dice {
  let mut generator = new_generator(r, ctx); // generator is a PRG
  Dice { value: random::generate_u8_in_range(&mut generator, 1, 6) }
}
```

`Random` has a reserved address `0x8` . See [random.move](/references/framework/sui-framework/sui_sui/random) for the Move APIs for accessing randomness on Sui.

info
Although `Random` is a shared object, it is inaccessible for mutable operations, and any transaction attempting to modify it fails.

Having access to random numbers is only one part of designing secure applications, you should also pay careful attention to how you use that randomness. To securely access randomness:

- Define your function as (private) `entry` .
- Prefer generating randomness using function-local `RandomGenerator` .
- Make sure that the "unhappy path" of your function does not consume more resources than the "happy path".

## Limited resources and `Random` dependent flows

Be aware that some resources that are available to transactions are limited. If you are not careful, an attacker can break or exploit your application by deliberately controlling the point where your function runs out of resources.

Concretely, gas is such a resource. Consider the following vulnerable code:

```move
// Insecure implementation, do not use!
entry fun insecure_play(r: &Random, payment: Coin<SUI>, ...) {
  ...
  let mut generator = new_generator(r, ctx);
  let win = generator.generate_bool();
  if (win) { // happy flow
    ... cheap computation ...
  } else {
    ... very expensive computation ...
  }
}
```

Observe that the gas costs of a transaction that calls `insecure_play` depends on the value of `win` . An attacker could call this function with a gas budget that is sufficient for the "happy flow" but not the "unhappy one", resulting in it either winning or reverting the transaction (but never losing the payment).

warning
The `Random` API does not automatically prevent this kind of attack, and you must be aware of this subtlety when designing your contracts.

Other limited resources per transaction that you should consider are:

- The number of new objects.
- The number of objects that can be used (including dynamic fields).
- Number of events emitted.
- Number of UIDs generated, deleted, or transferred.
Click toopen Complete list of `ProtocolConfig` limits.

[crates/sui-protocol-config/src/lib.rs](https://github.com/MystenLabs/sui/blob/main/crates/sui-protocol-config/src/lib.rs)

```rust
/// Constants that change the behavior of the protocol.
///
/// The value of each constant here must be fixed for a given protocol version. To change the value
/// of a constant, advance the protocol version, and add support for it in `get_for_version` under
/// the new version number.
/// (below).
///
/// To add a new field to this struct, use the following procedure:
/// - Advance the protocol version.
/// - Add the field as a private `Option<T>` to the struct.
/// - Initialize the field to `None` in prior protocol versions.
/// - Initialize the field to `Some(val)` for your new protocol version.
/// - Add a public getter that simply unwraps the field.
/// - Two public getters of the form `field(&self) -> field_type`
///     and `field_as_option(&self) -> Option<field_type>` will be automatically generated for you.
/// Example for a field: `new_constant: Option<u64>`
/// ```rust,ignore
///      pub fn new_constant(&self) -> u64 {
///         self.new_constant.expect(Self::CONSTANT_ERR_MSG)
///     }
///      pub fn new_constant_as_option(&self) -> Option<u64> {
///         self.new_constant.expect(Self::CONSTANT_ERR_MSG)
///     }
/// ```
/// With `pub fn new_constant(&self) -> u64`, if the constant is accessed in a protocol version
/// in which it is not defined, the validator will crash. (Crashing is necessary because
/// this type of error would almost always result in forking if not prevented here).
/// If you don't want the validator to crash, you can use the
/// `pub fn new_constant_as_option(&self) -> Option<u64>` getter, which will
/// return `None` if the field is not defined at that version.
/// - If you want a customized getter, you can add a method in the impl.
#[skip_serializing_none]
#[derive(Clone, Serialize, Debug, ProtocolConfigAccessors, ProtocolConfigOverride)]
pub struct ProtocolConfig {
    pub version: ProtocolVersion,

    feature_flags: FeatureFlags,

    // ==== Transaction input limits ====
    /// Maximum serialized size of a transaction (in bytes).
    max_tx_size_bytes: Option<u64>,

    /// Maximum number of input objects to a transaction. Enforced by the transaction input checker
    max_input_objects: Option<u64>,

    /// Max size of objects a transaction can write to disk after completion. Enforce by the Sui adapter.
    /// This is the sum of the serialized size of all objects written to disk.
    /// The max size of individual objects on the other hand is `max_move_object_size`.
    max_size_written_objects: Option<u64>,
    /// Max size of objects a system transaction can write to disk after completion. Enforce by the Sui adapter.
    /// Similar to `max_size_written_objects` but for system transactions.
    max_size_written_objects_system_tx: Option<u64>,

    /// Maximum size of serialized transaction effects.
    max_serialized_tx_effects_size_bytes: Option<u64>,

    /// Maximum size of serialized transaction effects for system transactions.
    max_serialized_tx_effects_size_bytes_system_tx: Option<u64>,

    /// Maximum number of gas payment objects for a transaction.
    max_gas_payment_objects: Option<u32>,

    /// Maximum number of modules in a Publish transaction.
    max_modules_in_publish: Option<u32>,

    /// Maximum number of transitive dependencies in a package when publishing.
    max_package_dependencies: Option<u32>,

    /// Maximum number of arguments in a move call or a ProgrammableTransaction's
    /// TransferObjects command.
    max_arguments: Option<u32>,

    /// Maximum number of total type arguments, computed recursively.
    max_type_arguments: Option<u32>,

    /// Maximum depth of an individual type argument.
    max_type_argument_depth: Option<u32>,

    /// Maximum size of a Pure CallArg.
    max_pure_argument_size: Option<u32>,

    /// Maximum number of Commands in a ProgrammableTransaction.
    max_programmable_tx_commands: Option<u32>,

    // ==== Move VM, Move bytecode verifier, and execution limits ===
    /// Maximum Move bytecode version the VM understands. All older versions are accepted.
    move_binary_format_version: Option<u32>,
    min_move_binary_format_version: Option<u32>,

    /// Configuration controlling binary tables size.
    binary_module_handles: Option<u16>,
    binary_struct_handles: Option<u16>,
    binary_function_handles: Option<u16>,
    binary_function_instantiations: Option<u16>,
    binary_signatures: Option<u16>,
    binary_constant_pool: Option<u16>,
    binary_identifiers: Option<u16>,
    binary_address_identifiers: Option<u16>,
    binary_struct_defs: Option<u16>,
    binary_struct_def_instantiations: Option<u16>,
    binary_function_defs: Option<u16>,
    binary_field_handles: Option<u16>,
    binary_field_instantiations: Option<u16>,
    binary_friend_decls: Option<u16>,
    binary_enum_defs: Option<u16>,
    binary_enum_def_instantiations: Option<u16>,
    binary_variant_handles: Option<u16>,
    binary_variant_instantiation_handles: Option<u16>,

    /// Maximum size of the `contents` part of an object, in bytes. Enforced by the Sui adapter when effects are produced.
    max_move_object_size: Option<u64>,

    // TODO: Option<increase to 500 KB. currently, publishing a package > 500 KB exceeds the max computation gas cost
    /// Maximum size of a Move package object, in bytes. Enforced by the Sui adapter at the end of a publish transaction.
    max_move_package_size: Option<u64>,

    /// Max number of publish or upgrade commands allowed in a programmable transaction block.
    max_publish_or_upgrade_per_ptb: Option<u64>,

    /// Maximum gas budget in MIST that a transaction can use.
    max_tx_gas: Option<u64>,

    /// Maximum amount of the proposed gas price in MIST (defined in the transaction).
    max_gas_price: Option<u64>,

    /// For aborted txns, we cap the gas price at a factor of RGP. This lowers risk of setting higher priority gas price
    /// if there's a chance the txn will abort.
    max_gas_price_rgp_factor_for_aborted_transactions: Option<u64>,

    /// The max computation bucket for gas. This is the max that can be charged for computation.
    max_gas_computation_bucket: Option<u64>,

    // Define the value used to round up computation gas charges
    gas_rounding_step: Option<u64>,

    /// Maximum number of nested loops. Enforced by the Move bytecode verifier.
    max_loop_depth: Option<u64>,

    /// Maximum number of type arguments that can be bound to generic type parameters. Enforced by the Move bytecode verifier.
    max_generic_instantiation_length: Option<u64>,

    /// Maximum number of parameters that a Move function can have. Enforced by the Move bytecode verifier.
    max_function_parameters: Option<u64>,

    /// Maximum number of basic blocks that a Move function can have. Enforced by the Move bytecode verifier.
    max_basic_blocks: Option<u64>,

    /// Maximum stack size value. Enforced by the Move bytecode verifier.
    max_value_stack_size: Option<u64>,

    /// Maximum number of "type nodes", a metric for how big a SignatureToken will be when expanded into a fully qualified type. Enforced by the Move bytecode verifier.
    max_type_nodes: Option<u64>,

    /// Maximum number of push instructions in one function. Enforced by the Move bytecode verifier.
    max_push_size: Option<u64>,

    /// Maximum number of struct definitions in a module. Enforced by the Move bytecode verifier.
    max_struct_definitions: Option<u64>,

    /// Maximum number of function definitions in a module. Enforced by the Move bytecode verifier.
    max_function_definitions: Option<u64>,

    /// Maximum number of fields allowed in a struct definition. Enforced by the Move bytecode verifier.
    max_fields_in_struct: Option<u64>,

    /// Maximum dependency depth. Enforced by the Move linker when loading dependent modules.
    max_dependency_depth: Option<u64>,

    /// Maximum number of Move events that a single transaction can emit. Enforced by the VM during execution.
    max_num_event_emit: Option<u64>,

    /// Maximum number of new IDs that a single transaction can create. Enforced by the VM during execution.
    max_num_new_move_object_ids: Option<u64>,

    /// Maximum number of new IDs that a single system transaction can create. Enforced by the VM during execution.
    max_num_new_move_object_ids_system_tx: Option<u64>,

    /// Maximum number of IDs that a single transaction can delete. Enforced by the VM during execution.
    max_num_deleted_move_object_ids: Option<u64>,

    /// Maximum number of IDs that a single system transaction can delete. Enforced by the VM during execution.
    max_num_deleted_move_object_ids_system_tx: Option<u64>,

    /// Maximum number of IDs that a single transaction can transfer. Enforced by the VM during execution.
    max_num_transferred_move_object_ids: Option<u64>,

    /// Maximum number of IDs that a single system transaction can transfer. Enforced by the VM during execution.
    max_num_transferred_move_object_ids_system_tx: Option<u64>,

    /// Maximum size of a Move user event. Enforced by the VM during execution.
    max_event_emit_size: Option<u64>,

    /// Maximum size of a Move user event. Enforced by the VM during execution.
    max_event_emit_size_total: Option<u64>,

    /// Maximum length of a vector in Move. Enforced by the VM during execution, and for constants, by the verifier.
    max_move_vector_len: Option<u64>,

    /// Maximum length of an `Identifier` in Move. Enforced by the bytecode verifier at signing.
    max_move_identifier_len: Option<u64>,

    /// Maximum depth of a Move value within the VM.
    max_move_value_depth: Option<u64>,

    /// Maximum number of variants in an enum. Enforced by the bytecode verifier at signing.
    max_move_enum_variants: Option<u64>,

    /// Maximum number of back edges in Move function. Enforced by the bytecode verifier at signing.
    max_back_edges_per_function: Option<u64>,

    /// Maximum number of back edges in Move module. Enforced by the bytecode verifier at signing.
    max_back_edges_per_module: Option<u64>,

    /// Maximum number of meter `ticks` spent verifying a Move function. Enforced by the bytecode verifier at signing.
    max_verifier_meter_ticks_per_function: Option<u64>,

    /// Maximum number of meter `ticks` spent verifying a Move module. Enforced by the bytecode verifier at signing.
    max_meter_ticks_per_module: Option<u64>,

    /// Maximum number of meter `ticks` spent verifying a Move package. Enforced by the bytecode verifier at signing.
    max_meter_ticks_per_package: Option<u64>,

    // === Object runtime internal operation limits ====
    // These affect dynamic fields
    /// Maximum number of cached objects in the object runtime ObjectStore. Enforced by object runtime during execution
    object_runtime_max_num_cached_objects: Option<u64>,

    /// Maximum number of cached objects in the object runtime ObjectStore in system transaction. Enforced by object runtime during execution
    object_runtime_max_num_cached_objects_system_tx: Option<u64>,

    /// Maximum number of stored objects accessed by object runtime ObjectStore. Enforced by object runtime during execution
    object_runtime_max_num_store_entries: Option<u64>,

    /// Maximum number of stored objects accessed by object runtime ObjectStore in system transaction. Enforced by object runtime during execution
    object_runtime_max_num_store_entries_system_tx: Option<u64>,

    // === Execution gas costs ====
    /// Base cost for any Sui transaction
    base_tx_cost_fixed: Option<u64>,

    /// Additional cost for a transaction that publishes a package
    /// i.e., the base cost of such a transaction is base_tx_cost_fixed + package_publish_cost_fixed
    package_publish_cost_fixed: Option<u64>,

    /// Cost per byte of a Move call transaction
    /// i.e., the cost of such a transaction is base_cost + (base_tx_cost_per_byte * size)
    base_tx_cost_per_byte: Option<u64>,

    /// Cost per byte for a transaction that publishes a package
    package_publish_cost_per_byte: Option<u64>,

    // Per-byte cost of reading an object during transaction execution
    obj_access_cost_read_per_byte: Option<u64>,

    // Per-byte cost of writing an object during transaction execution
    obj_access_cost_mutate_per_byte: Option<u64>,

    // Per-byte cost of deleting an object during transaction execution
    obj_access_cost_delete_per_byte: Option<u64>,

    /// Per-byte cost charged for each input object to a transaction.
    /// Meant to approximate the cost of checking locks for each object
    // TODO: Option<I'm not sure that this cost makes sense. Checking locks is "free"
    // in the sense that an invalid tx that can never be committed/pay gas can
    // force validators to check an arbitrary number of locks. If those checks are
    // "free" for invalid transactions, why charge for them in valid transactions
    // TODO: Option<if we keep this, I think we probably want it to be a fixed cost rather
    // than a per-byte cost. checking an object lock should not require loading an
    // entire object, just consulting an ID -> tx digest map
    obj_access_cost_verify_per_byte: Option<u64>,

    // Maximal nodes which are allowed when converting to a type layout.
    max_type_to_layout_nodes: Option<u64>,

    // Maximal size in bytes that a PTB value can be
    max_ptb_value_size: Option<u64>,

    // === Gas version. gas model ===
    /// Gas model version, what code we are using to charge gas
    gas_model_version: Option<u64>,

    // === Storage gas costs ===
    /// Per-byte cost of storing an object in the Sui global object store. Some of this cost may be refundable if the object is later freed
    obj_data_cost_refundable: Option<u64>,

    // Per-byte cost of storing an object in the Sui transaction log (e.g., in CertifiedTransactionEffects)
    // This depends on the size of various fields including the effects
    // TODO: Option<I don't fully understand this^ and more details would be useful
    obj_metadata_cost_non_refundable: Option<u64>,

    // === Tokenomics ===

    // TODO: Option<this should be changed to u64.
    /// Sender of a txn that touches an object will get this percent of the storage rebate back.
    /// In basis point.
    storage_rebate_rate: Option<u64>,

    /// 5% of the storage fund's share of rewards are reinvested into the storage fund.
    /// In basis point.
    storage_fund_reinvest_rate: Option<u64>,

    /// The share of rewards that will be slashed and redistributed is 50%.
    /// In basis point.
    reward_slashing_rate: Option<u64>,

    /// Unit gas price, Mist per internal gas unit.
    storage_gas_price: Option<u64>,

    // === Core Protocol ===
    /// Max number of transactions per checkpoint.
    /// Note that this is a protocol constant and not a config as validators must have this set to
    /// the same value, otherwise they *will* fork.
    max_transactions_per_checkpoint: Option<u64>,

    /// Max size of a checkpoint in bytes.
    /// Note that this is a protocol constant and not a config as validators must have this set to
    /// the same value, otherwise they *will* fork.
    max_checkpoint_size_bytes: Option<u64>,

    /// A protocol upgrade always requires 2f+1 stake to agree. We support a buffer of additional
    /// stake (as a fraction of f, expressed in basis points) that is required before an upgrade
    /// can happen automatically. 10000bps would indicate that complete unanimity is required (all
    /// 3f+1 must vote), while 0bps would indicate that 2f+1 is sufficient.
    buffer_stake_for_protocol_upgrade_bps: Option<u64>,

    // === Native Function Costs ===

    // `address` module
    // Cost params for the Move native function `address::from_bytes(bytes: vector<u8>)`
    address_from_bytes_cost_base: Option<u64>,
    // Cost params for the Move native function `address::to_u256(address): u256`
    address_to_u256_cost_base: Option<u64>,
    // Cost params for the Move native function `address::from_u256(u256): address`
    address_from_u256_cost_base: Option<u64>,

    // `config` module
    // Cost params for the Move native function `read_setting_impl<Name: copy + drop + store,
    // SettingValue: key + store, SettingDataValue: store, Value: copy + drop + store,
    // >(config: address, name: address, current_epoch: u64): Option<Value>`
    config_read_setting_impl_cost_base: Option<u64>,
    config_read_setting_impl_cost_per_byte: Option<u64>,

    // `dynamic_field` module
    // Cost params for the Move native function `hash_type_and_key<K: copy + drop + store>(parent: address, k: K): address`
    dynamic_field_hash_type_and_key_cost_base: Option<u64>,
    dynamic_field_hash_type_and_key_type_cost_per_byte: Option<u64>,
    dynamic_field_hash_type_and_key_value_cost_per_byte: Option<u64>,
    dynamic_field_hash_type_and_key_type_tag_cost_per_byte: Option<u64>,
    // Cost params for the Move native function `add_child_object<Child: key>(parent: address, child: Child)`
    dynamic_field_add_child_object_cost_base: Option<u64>,
    dynamic_field_add_child_object_type_cost_per_byte: Option<u64>,
    dynamic_field_add_child_object_value_cost_per_byte: Option<u64>,
    dynamic_field_add_child_object_struct_tag_cost_per_byte: Option<u64>,
    // Cost params for the Move native function `borrow_child_object_mut<Child: key>(parent: &mut UID, id: address): &mut Child`
    dynamic_field_borrow_child_object_cost_base: Option<u64>,
    dynamic_field_borrow_child_object_child_ref_cost_per_byte: Option<u64>,
    dynamic_field_borrow_child_object_type_cost_per_byte: Option<u64>,
    // Cost params for the Move native function `remove_child_object<Child: key>(parent: address, id: address): Child`
    dynamic_field_remove_child_object_cost_base: Option<u64>,
    dynamic_field_remove_child_object_child_cost_per_byte: Option<u64>,
    dynamic_field_remove_child_object_type_cost_per_byte: Option<u64>,
    // Cost params for the Move native function `has_child_object(parent: address, id: address): bool`
    dynamic_field_has_child_object_cost_base: Option<u64>,
    // Cost params for the Move native function `has_child_object_with_ty<Child: key>(parent: address, id: address): bool`
    dynamic_field_has_child_object_with_ty_cost_base: Option<u64>,
    dynamic_field_has_child_object_with_ty_type_cost_per_byte: Option<u64>,
    dynamic_field_has_child_object_with_ty_type_tag_cost_per_byte: Option<u64>,

    // `event` module
    // Cost params for the Move native function `event::emit<T: copy + drop>(event: T)`
    event_emit_cost_base: Option<u64>,
    event_emit_value_size_derivation_cost_per_byte: Option<u64>,
    event_emit_tag_size_derivation_cost_per_byte: Option<u64>,
    event_emit_output_cost_per_byte: Option<u64>,
    event_emit_auth_stream_cost: Option<u64>,

    //  `object` module
    // Cost params for the Move native function `borrow_uid<T: key>(obj: &T): &UID`
    object_borrow_uid_cost_base: Option<u64>,
    // Cost params for the Move native function `delete_impl(id: address)`
    object_delete_impl_cost_base: Option<u64>,
    // Cost params for the Move native function `record_new_uid(id: address)`
    object_record_new_uid_cost_base: Option<u64>,

    // Transfer
    // Cost params for the Move native function `transfer_impl<T: key>(obj: T, recipient: address)`
    transfer_transfer_internal_cost_base: Option<u64>,
    // Cost params for the Move native function `party_transfer_impl<T: key>(obj: T, party_members: vector<address>)`
    transfer_party_transfer_internal_cost_base: Option<u64>,
    // Cost params for the Move native function `freeze_object<T: key>(obj: T)`
    transfer_freeze_object_cost_base: Option<u64>,
    // Cost params for the Move native function `share_object<T: key>(obj: T)`
    transfer_share_object_cost_base: Option<u64>,
    // Cost params for the Move native function
    // `receive_object<T: key>(p: &mut UID, recv: Receiving<T>T)`
    transfer_receive_object_cost_base: Option<u64>,

    // TxContext
    // Cost params for the Move native function `transfer_impl<T: key>(obj: T, recipient: address)`
    tx_context_derive_id_cost_base: Option<u64>,
    tx_context_fresh_id_cost_base: Option<u64>,
    tx_context_sender_cost_base: Option<u64>,
    tx_context_epoch_cost_base: Option<u64>,
    tx_context_epoch_timestamp_ms_cost_base: Option<u64>,
    tx_context_sponsor_cost_base: Option<u64>,
    tx_context_rgp_cost_base: Option<u64>,
    tx_context_gas_price_cost_base: Option<u64>,
    tx_context_gas_budget_cost_base: Option<u64>,
    tx_context_ids_created_cost_base: Option<u64>,
    tx_context_replace_cost_base: Option<u64>,

    // Types
    // Cost params for the Move native function `is_one_time_witness<T: drop>(_: &T): bool`
    types_is_one_time_witness_cost_base: Option<u64>,
    types_is_one_time_witness_type_tag_cost_per_byte: Option<u64>,
    types_is_one_time_witness_type_cost_per_byte: Option<u64>,

    // Validator
    // Cost params for the Move native function `validate_metadata_bcs(metadata: vector<u8>)`
    validator_validate_metadata_cost_base: Option<u64>,
    validator_validate_metadata_data_cost_per_byte: Option<u64>,

    // Crypto natives
    crypto_invalid_arguments_cost: Option<u64>,
    // bls12381::bls12381_min_sig_verify
    bls12381_bls12381_min_sig_verify_cost_base: Option<u64>,
    bls12381_bls12381_min_sig_verify_msg_cost_per_byte: Option<u64>,
    bls12381_bls12381_min_sig_verify_msg_cost_per_block: Option<u64>,

    // bls12381::bls12381_min_pk_verify
    bls12381_bls12381_min_pk_verify_cost_base: Option<u64>,
    bls12381_bls12381_min_pk_verify_msg_cost_per_byte: Option<u64>,
    bls12381_bls12381_min_pk_verify_msg_cost_per_block: Option<u64>,

    // ecdsa_k1::ecrecover
    ecdsa_k1_ecrecover_keccak256_cost_base: Option<u64>,
    ecdsa_k1_ecrecover_keccak256_msg_cost_per_byte: Option<u64>,
    ecdsa_k1_ecrecover_keccak256_msg_cost_per_block: Option<u64>,
    ecdsa_k1_ecrecover_sha256_cost_base: Option<u64>,
    ecdsa_k1_ecrecover_sha256_msg_cost_per_byte: Option<u64>,
    ecdsa_k1_ecrecover_sha256_msg_cost_per_block: Option<u64>,

    // ecdsa_k1::decompress_pubkey
    ecdsa_k1_decompress_pubkey_cost_base: Option<u64>,

    // ecdsa_k1::secp256k1_verify
    ecdsa_k1_secp256k1_verify_keccak256_cost_base: Option<u64>,
    ecdsa_k1_secp256k1_verify_keccak256_msg_cost_per_byte: Option<u64>,
    ecdsa_k1_secp256k1_verify_keccak256_msg_cost_per_block: Option<u64>,
    ecdsa_k1_secp256k1_verify_sha256_cost_base: Option<u64>,
    ecdsa_k1_secp256k1_verify_sha256_msg_cost_per_byte: Option<u64>,
    ecdsa_k1_secp256k1_verify_sha256_msg_cost_per_block: Option<u64>,

    // ecdsa_r1::ecrecover
    ecdsa_r1_ecrecover_keccak256_cost_base: Option<u64>,
    ecdsa_r1_ecrecover_keccak256_msg_cost_per_byte: Option<u64>,
    ecdsa_r1_ecrecover_keccak256_msg_cost_per_block: Option<u64>,
    ecdsa_r1_ecrecover_sha256_cost_base: Option<u64>,
    ecdsa_r1_ecrecover_sha256_msg_cost_per_byte: Option<u64>,
    ecdsa_r1_ecrecover_sha256_msg_cost_per_block: Option<u64>,

    // ecdsa_r1::secp256k1_verify
    ecdsa_r1_secp256r1_verify_keccak256_cost_base: Option<u64>,
    ecdsa_r1_secp256r1_verify_keccak256_msg_cost_per_byte: Option<u64>,
    ecdsa_r1_secp256r1_verify_keccak256_msg_cost_per_block: Option<u64>,
    ecdsa_r1_secp256r1_verify_sha256_cost_base: Option<u64>,
    ecdsa_r1_secp256r1_verify_sha256_msg_cost_per_byte: Option<u64>,
    ecdsa_r1_secp256r1_verify_sha256_msg_cost_per_block: Option<u64>,

    // ecvrf::verify
    ecvrf_ecvrf_verify_cost_base: Option<u64>,
    ecvrf_ecvrf_verify_alpha_string_cost_per_byte: Option<u64>,
    ecvrf_ecvrf_verify_alpha_string_cost_per_block: Option<u64>,

    // ed25519
    ed25519_ed25519_verify_cost_base: Option<u64>,
    ed25519_ed25519_verify_msg_cost_per_byte: Option<u64>,
    ed25519_ed25519_verify_msg_cost_per_block: Option<u64>,

    // groth16::prepare_verifying_key
    groth16_prepare_verifying_key_bls12381_cost_base: Option<u64>,
    groth16_prepare_verifying_key_bn254_cost_base: Option<u64>,

    // groth16::verify_groth16_proof_internal
    groth16_verify_groth16_proof_internal_bls12381_cost_base: Option<u64>,
    groth16_verify_groth16_proof_internal_bls12381_cost_per_public_input: Option<u64>,
    groth16_verify_groth16_proof_internal_bn254_cost_base: Option<u64>,
    groth16_verify_groth16_proof_internal_bn254_cost_per_public_input: Option<u64>,
    groth16_verify_groth16_proof_internal_public_input_cost_per_byte: Option<u64>,

    // hash::blake2b256
    hash_blake2b256_cost_base: Option<u64>,
    hash_blake2b256_data_cost_per_byte: Option<u64>,
    hash_blake2b256_data_cost_per_block: Option<u64>,

    // hash::keccak256
    hash_keccak256_cost_base: Option<u64>,
    hash_keccak256_data_cost_per_byte: Option<u64>,
    hash_keccak256_data_cost_per_block: Option<u64>,

    // poseidon::poseidon_bn254
    poseidon_bn254_cost_base: Option<u64>,
    poseidon_bn254_cost_per_block: Option<u64>,

    // group_ops
    group_ops_bls12381_decode_scalar_cost: Option<u64>,
    group_ops_bls12381_decode_g1_cost: Option<u64>,
    group_ops_bls12381_decode_g2_cost: Option<u64>,
    group_ops_bls12381_decode_gt_cost: Option<u64>,
    group_ops_bls12381_scalar_add_cost: Option<u64>,
    group_ops_bls12381_g1_add_cost: Option<u64>,
    group_ops_bls12381_g2_add_cost: Option<u64>,
    group_ops_bls12381_gt_add_cost: Option<u64>,
    group_ops_bls12381_scalar_sub_cost: Option<u64>,
    group_ops_bls12381_g1_sub_cost: Option<u64>,
    group_ops_bls12381_g2_sub_cost: Option<u64>,
    group_ops_bls12381_gt_sub_cost: Option<u64>,
    group_ops_bls12381_scalar_mul_cost: Option<u64>,
    group_ops_bls12381_g1_mul_cost: Option<u64>,
    group_ops_bls12381_g2_mul_cost: Option<u64>,
    group_ops_bls12381_gt_mul_cost: Option<u64>,
    group_ops_bls12381_scalar_div_cost: Option<u64>,
    group_ops_bls12381_g1_div_cost: Option<u64>,
    group_ops_bls12381_g2_div_cost: Option<u64>,
    group_ops_bls12381_gt_div_cost: Option<u64>,
    group_ops_bls12381_g1_hash_to_base_cost: Option<u64>,
    group_ops_bls12381_g2_hash_to_base_cost: Option<u64>,
    group_ops_bls12381_g1_hash_to_cost_per_byte: Option<u64>,
    group_ops_bls12381_g2_hash_to_cost_per_byte: Option<u64>,
    group_ops_bls12381_g1_msm_base_cost: Option<u64>,
    group_ops_bls12381_g2_msm_base_cost: Option<u64>,
    group_ops_bls12381_g1_msm_base_cost_per_input: Option<u64>,
    group_ops_bls12381_g2_msm_base_cost_per_input: Option<u64>,
    group_ops_bls12381_msm_max_len: Option<u32>,
    group_ops_bls12381_pairing_cost: Option<u64>,
    group_ops_bls12381_g1_to_uncompressed_g1_cost: Option<u64>,
    group_ops_bls12381_uncompressed_g1_to_g1_cost: Option<u64>,
    group_ops_bls12381_uncompressed_g1_sum_base_cost: Option<u64>,
    group_ops_bls12381_uncompressed_g1_sum_cost_per_term: Option<u64>,
    group_ops_bls12381_uncompressed_g1_sum_max_terms: Option<u64>,

    // hmac::hmac_sha3_256
    hmac_hmac_sha3_256_cost_base: Option<u64>,
    hmac_hmac_sha3_256_input_cost_per_byte: Option<u64>,
    hmac_hmac_sha3_256_input_cost_per_block: Option<u64>,

    // zklogin::check_zklogin_id
    check_zklogin_id_cost_base: Option<u64>,
    // zklogin::check_zklogin_issuer
    check_zklogin_issuer_cost_base: Option<u64>,

    vdf_verify_vdf_cost: Option<u64>,
    vdf_hash_to_input_cost: Option<u64>,

    // nitro_attestation::load_nitro_attestation
    nitro_attestation_parse_base_cost: Option<u64>,
    nitro_attestation_parse_cost_per_byte: Option<u64>,
    nitro_attestation_verify_base_cost: Option<u64>,
    nitro_attestation_verify_cost_per_cert: Option<u64>,

    // Stdlib costs
    bcs_per_byte_serialized_cost: Option<u64>,
    bcs_legacy_min_output_size_cost: Option<u64>,
    bcs_failure_cost: Option<u64>,

    hash_sha2_256_base_cost: Option<u64>,
    hash_sha2_256_per_byte_cost: Option<u64>,
    hash_sha2_256_legacy_min_input_len_cost: Option<u64>,
    hash_sha3_256_base_cost: Option<u64>,
    hash_sha3_256_per_byte_cost: Option<u64>,
    hash_sha3_256_legacy_min_input_len_cost: Option<u64>,
    type_name_get_base_cost: Option<u64>,
    type_name_get_per_byte_cost: Option<u64>,
    type_name_id_base_cost: Option<u64>,

    string_check_utf8_base_cost: Option<u64>,
    string_check_utf8_per_byte_cost: Option<u64>,
    string_is_char_boundary_base_cost: Option<u64>,
    string_sub_string_base_cost: Option<u64>,
    string_sub_string_per_byte_cost: Option<u64>,
    string_index_of_base_cost: Option<u64>,
    string_index_of_per_byte_pattern_cost: Option<u64>,
    string_index_of_per_byte_searched_cost: Option<u64>,

    vector_empty_base_cost: Option<u64>,
    vector_length_base_cost: Option<u64>,
    vector_push_back_base_cost: Option<u64>,
    vector_push_back_legacy_per_abstract_memory_unit_cost: Option<u64>,
    vector_borrow_base_cost: Option<u64>,
    vector_pop_back_base_cost: Option<u64>,
    vector_destroy_empty_base_cost: Option<u64>,
    vector_swap_base_cost: Option<u64>,
    debug_print_base_cost: Option<u64>,
    debug_print_stack_trace_base_cost: Option<u64>,

    // ==== Ephemeral (consensus only) params deleted ====
    //
    // Const params for consensus scoring decision
    // The scaling factor property for the MED outlier detection
    // scoring_decision_mad_divisor: Option<f64>,
    // The cutoff value for the MED outlier detection
    // scoring_decision_cutoff_value: Option<f64>,
    /// === Execution Version ===
    execution_version: Option<u64>,

    // Dictates the threshold (percentage of stake) that is used to calculate the "bad" nodes to be
    // swapped when creating the consensus schedule. The values should be of the range [0 - 33]. Anything
    // above 33 (f) will not be allowed.
    consensus_bad_nodes_stake_threshold: Option<u64>,

    max_jwk_votes_per_validator_per_epoch: Option<u64>,
    // The maximum age of a JWK in epochs before it is removed from the AuthenticatorState object.
    // Applied at the end of an epoch as a delta from the new epoch value, so setting this to 1
    // will cause the new epoch to start with JWKs from the previous epoch still valid.
    max_age_of_jwk_in_epochs: Option<u64>,

    // === random beacon ===
    /// Maximum allowed precision loss when reducing voting weights for the random beacon
    /// protocol.
    random_beacon_reduction_allowed_delta: Option<u16>,

    /// Minimum number of shares below which voting weights will not be reduced for the
    /// random beacon protocol.
    random_beacon_reduction_lower_bound: Option<u32>,

    /// Consensus Round after which DKG should be aborted and randomness disabled for
    /// the epoch, if it hasn't already completed.
    random_beacon_dkg_timeout_round: Option<u32>,

    /// Minimum interval between consecutive rounds of generated randomness.
    random_beacon_min_round_interval_ms: Option<u64>,

    /// Version of the random beacon DKG protocol.
    /// 0 was deprecated (and currently not supported), 1 is the default version.
    random_beacon_dkg_version: Option<u64>,

    /// The maximum serialised transaction size (in bytes) accepted by consensus. That should be bigger than the
    /// `max_tx_size_bytes` with some additional headroom.
    consensus_max_transaction_size_bytes: Option<u64>,
    /// The maximum size of transactions included in a consensus block.
    consensus_max_transactions_in_block_bytes: Option<u64>,
    /// The maximum number of transactions included in a consensus block.
    consensus_max_num_transactions_in_block: Option<u64>,

    /// The maximum number of rounds where transaction voting is allowed.
    consensus_voting_rounds: Option<u32>,

    /// DEPRECATED. Do not use.
    max_accumulated_txn_cost_per_object_in_narwhal_commit: Option<u64>,

    /// The max number of consensus rounds a transaction can be deferred due to shared object congestion.
    /// Transactions will be cancelled after this many rounds.
    max_deferral_rounds_for_congestion_control: Option<u64>,

    /// If >0, congestion control will allow the configured maximum accumulated cost per object
    /// to be exceeded by at most the given amount. Only one limit-exceeding transaction per
    /// object will be allowed, unless bursting is configured below.
    max_txn_cost_overage_per_object_in_commit: Option<u64>,

    /// If >0, congestion control will allow transactions in total cost equaling the
    /// configured amount to exceed the configured maximum accumulated cost per object.
    /// As above, up to one transaction per object exceeding the burst limit will be allowed.
    allowed_txn_cost_overage_burst_per_object_in_commit: Option<u64>,

    /// Minimum interval of commit timestamps between consecutive checkpoints.
    min_checkpoint_interval_ms: Option<u64>,

    /// Version number to use for version_specific_data in `CheckpointSummary`.
    checkpoint_summary_version_specific_data: Option<u64>,

    /// The max number of transactions that can be included in a single Soft Bundle.
    max_soft_bundle_size: Option<u64>,

    /// Whether to try to form bridge committee
    // Note: this is not a feature flag because we want to distinguish between
    // `None` and `Some(false)`, as committee was already finalized on Testnet.
    bridge_should_try_to_finalize_committee: Option<bool>,

    /// The max accumulated txn execution cost per object in a mysticeti. Transactions
    /// in a commit will be deferred once their touch shared objects hit this limit,
    /// unless the selected congestion control mode allows overage.
    /// This config plays the same role as `max_accumulated_txn_cost_per_object_in_narwhal_commit`
    /// but for mysticeti commits due to that mysticeti has higher commit rate.
    max_accumulated_txn_cost_per_object_in_mysticeti_commit: Option<u64>,

    /// As above, but separate per-commit budget for transactions that use randomness.
    /// If not configured, uses the setting for `max_accumulated_txn_cost_per_object_in_mysticeti_commit`.
    max_accumulated_randomness_txn_cost_per_object_in_mysticeti_commit: Option<u64>,

    /// Configures the garbage collection depth for consensus. When is unset or `0` then the garbage collection
    /// is disabled.
    consensus_gc_depth: Option<u32>,

    /// Used to calculate the max transaction cost when using TotalGasBudgetWithCap as shard
    /// object congestion control strategy. Basically the max transaction cost is calculated as
    /// (num of input object + num of commands) * this factor.
    gas_budget_based_txn_cost_cap_factor: Option<u64>,

    /// Adds an absolute cap on the maximum transaction cost when using TotalGasBudgetWithCap at
    /// the given multiple of the per-commit budget.
    gas_budget_based_txn_cost_absolute_cap_commit_count: Option<u64>,

    /// SIP-45: K in the formula `amplification_factor = max(0, gas_price / reference_gas_price - K)`.
    /// This is the threshold for activating consensus amplification.
    sip_45_consensus_amplification_threshold: Option<u64>,

    /// DEPRECATED: this was an ephemeral feature flag only used in per-epoch tables, which has now
    /// been deployed everywhere.
    use_object_per_epoch_marker_table_v2: Option<bool>,

    /// The number of commits to consider when computing a deterministic commit rate.
    consensus_commit_rate_estimation_window_size: Option<u32>,

    /// A list of effective AliasedAddress.
    /// For each pair, `aliased` is allowed to act as `original` for any of the transaction digests
    /// listed in `tx_digests`
    #[serde(skip_serializing_if = "Vec::is_empty")]
    aliased_addresses: Vec<AliasedAddress>,

    /// The base charge for each command in a programmable transaction. This is a fixed cost to
    /// account for the overhead of processing each command.
    translation_per_command_base_charge: Option<u64>,

    /// The base charge for each input in a programmable transaction regardless of if it is used or
    /// not, or a pure/object/funds withdrawal input.
    translation_per_input_base_charge: Option<u64>,

    /// The base charge for each byte of pure input in a programmable transaction.
    translation_pure_input_per_byte_charge: Option<u64>,

    /// The multiplier for the number of type nodes when charging for type loading.
    /// This is multiplied by the number of type nodes to get the total cost.
    /// This should be a small number to avoid excessive gas costs for loading types.
    translation_per_type_node_charge: Option<u64>,

    /// The multiplier for the number of type references when charging for type checking and reference
    /// checking.
    translation_per_reference_node_charge: Option<u64>,

    /// The multiplier for each linkage entry when charging for linkage tables that we have
    /// created.
    translation_per_linkage_entry_charge: Option<u64>,

    /// The maximum number of updates per settlement transaction.
    max_updates_per_settlement_txn: Option<u32>,
}
```

For many use cases, like when selecting a raffle winner or lottery numbers, this attack is not an issue as the code running is independent of the randomness. However, in other use cases where this attack can be problematic, consider using one of the following approaches:

### Option 1: Divide logic

Split the logic into 2 functions that different transactions must call.

1. The first transaction, `tx1` , calls the first function, which fetches a random value and stores it in an object that is unreadable by other commands in `tx1` . For example, the function might transfer the object to the caller or store the transaction digest and check that it's different on read.
2. The second transaction, `tx2` , calls a second function, which reads the stored value and completes the operation. `tx2` might fail, but now the random value is fixed and cannot be modified using repeated calls. It's important that the inputs to the second function are fixed and cannot be modified after `tx1` , otherwise an attacker can modify them after seeing the randomness committed by `tx1` .
Gracefully handle the case in which the second step is never completed. You could accomplish this, for example, by charging a fee in the first step.

Click toopen Example implementation.

[examples/move/random/random_nft/sources/example.move](https://github.com/MystenLabs/sui/blob/main/examples/move/random/random_nft/sources/example.move)

```move
entry fun reveal_alternative2_step1(nft: AirDropNFT, r: &Random, ctx: &mut TxContext) {
    destroy_airdrop_nft(nft);

    let mut generator = new_generator(r, ctx);
    let v = generator.generate_u8_in_range(1, 100);

    transfer::public_transfer(
        RandomnessNFT { id: object::new(ctx), value: v },
        ctx.sender(),
    );
}
public fun reveal_alternative2_step2(nft: RandomnessNFT, ctx: &mut TxContext): MetalNFT {
    let RandomnessNFT { id, value } = nft;
    delete(id);

    let metal = if (value <= 10) GOLD
    else if (10 < value && value <= 40) SILVER
    else BRONZE;

    MetalNFT {
        id: object::new(ctx),
        metal,
    }
}
```

### Option 2: Resource usage

Write the function so the main processing path does the heavy work, while early-exit paths return quickly. Keep the following in mind:

- Both external or native functions can change in the future, potentially resulting in different costs compared to when you conducted your tests.
- [Profile the transaction](/references/cli/trace-analysis#profile-a-transaction) to benchmark the costs of a transaction.
- UIDs generated and deleted on the same transaction do not count towards the limit on generated or deleted UIDs.

## Use (non-public) `entry` functions

While composition is very powerful for smart contracts, it opens the door to attacks on functions that use randomness.

Consider for example a betting game that uses randomness for rolling dice:

```move
module games::dice {
  ...
  public enum Ticket has drop {
    Lost,
    Won,
  }

  public fun is_winner(t: &Ticket): bool {
    match (t) {
      Ticket::Won => true,
      Ticket::Lost => false,
    }
  }

  /// If you guess correctly the output, then you get a GuessedCorrectly object.
  /// Otherwise you get nothing.
  public fun play_dice(guess: u8, fee: Coin<SUI>, r: &Random, ctx: &mut TxContext): Ticket {
    // Pay for the turn
    assert!(coin::value(&fee) == 1000000, EInvalidAmount);
    transfer::public_transfer(fee, CREATOR_ADDRESS);

    // Roll the dice
    let mut generator = new_generator(r, ctx);
    if (guess == generator.generate_u8_in_range(1, 6)) {
      Ticket::Won
    } else {
      Ticket::Lost
    }
  }
  ...
}
```

An attacker can deploy the next function:

```move
public fun attack(guess: u8, r: &Random, ctx: &mut TxContext): Ticket {
  let t = dice::play_dice(guess, r, ctx);
  // revert the transaction if play_dice lost
  assert!(!dice::is_winner(&t), 0);
  t
}
```

The attacker can now call `attack` with a guess and always revert the fee transfer if the guess is incorrect.

To protect against composition attacks, define your function as a private `entry` function so functions from other modules cannot call it.

tip
The Move compiler enforces this behavior by rejecting `public` functions with `Random` as an argument.

## Programmable transaction block (PTB) restrictions

A similar attack to the one previously described involves PTBs even when `play_dice` is defined as a private `entry` function. For example, consider the `entry play_dice(guess: u8, fee: Coin<SUI>, r: &Random, ctx: &mut TxContext): Ticket { â€¦ }` function defined earlier, the attacker can publish the function

```move
public fun attack(t: Ticket): Ticket {
  assert!(!dice::is_winner(&t), 0);
  t
}
```

and send a PTB with commands `play_dice(...), attack(Result(0))` where `Result(0)` is the output of the first command.

As before, the attack takes advantage of the atomic nature of PTBs and always reverts the entire transaction if the guess was incorrect, without paying the fee. Sending multiple transactions can repeat the attack, each one executed with different randomness and reverted if the guess is incorrect.

tip
To protect against PTB-based composition attacks, Sui rejects PTBs that have commands that are not `TransferObjects` or `MergeCoins` following a `MoveCall` command that uses `Random` as an input.

## Instantiating `RandomGenerator`

`RandomGenerator` is secure as long as it's created by the consuming module. If passed as an argument, the caller might be able to predict the outputs of that `RandomGenerator` instance (for example, by calling `bcs::to_bytes(&generator)` and parsing its internal state).

tip
The Move compiler enforces this behavior by rejecting `public` functions with `RandomGenerator` as an argument.

## Accessing `Random` from TypeScript

If you want to call `roll_dice(r: &Random, ctx: &mut TxContext)` in module `example` , use the following code snippet:

```typescript
const tx = new Transaction();
tx.moveCall({
  target: "${PACKAGE_ID}::example::roll_dice",
  arguments: [tx.object.random()]
});
...
```

## Related Links

â€¢ [Sui Framework](/references/framework) The Sui framework libraries include Move modules that provide the logic for Sui and its standards. A Rust process creates the documentation for the modules directly from comments in the code.

â€¢ [random.move](https://docs.sui.io/references/framework/sui_sui/random) Documentation for the `random` module.

â€¢ [Raffle example](https://github.com/MystenLabs/sui/blob/main/examples/move/random/raffles) GitHub repo containing a raffle smart contract demonstrating randomness.

â€¢ [Sui Client CLI](/references/cli/client) The Sui Client CLI provides command-level access to interact with the Sui network.
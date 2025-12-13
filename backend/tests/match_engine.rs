use backend::{code_analysis::characteristics::CodeCharacteristics, endpoints::match_styles};

#[test]
pub fn match_engine_test() {
    let target = serde_json::from_str::<CodeCharacteristics>(r#"{
    "avg_lines_per_function": 13.2,
    "functional_vs_oop_ratio": 0.1,
    "recursion_vs_loop_ratio": 0.0,
    "dependency_coupling_index": 0.3,
    "modularity_index_score": 0.7,
    "avg_nesting_depth": 1.1,
    "abstraction_layer_count": 2.0,
    "immutability_score": 0.2,
    "error_handling_centralization_score": 0.6,
    "test_structure_modularity_ratio": 0.0
}"#).unwrap();

    let user1 = serde_json::from_str::<CodeCharacteristics>(r#"{
    "avg_lines_per_function": 10.5,
    "functional_vs_oop_ratio": 0.0,
    "recursion_vs_loop_ratio": 0.0,
    "dependency_coupling_index": 0.3,
    "modularity_index_score": 0.7,
    "avg_nesting_depth": 1.2,
    "abstraction_layer_count": 2.0,
    "immutability_score": 0.1,
    "error_handling_centralization_score": 0.0,
    "test_structure_modularity_ratio": 0.2
}"#).unwrap();
    let user2 = serde_json::from_str::<CodeCharacteristics>(r#"{
    "avg_lines_per_function": 15.0,
    "functional_vs_oop_ratio": 0.8,
    "recursion_vs_loop_ratio": 0.01,
    "dependency_coupling_index": 0.3,
    "modularity_index_score": 0.6,
    "avg_nesting_depth": 1.8,
    "abstraction_layer_count": 3.0,
    "immutability_score": 0.4,
    "error_handling_centralization_score": 0.7,
    "test_structure_modularity_ratio": 0.1
}"#).unwrap();
    let user3 = serde_json::from_str::<CodeCharacteristics>(r#"{
    "avg_lines_per_function": 18.25,
    "functional_vs_oop_ratio": 1.0,
    "recursion_vs_loop_ratio": 0.0,
    "dependency_coupling_index": 0.6,
    "modularity_index_score": 0.6,
    "avg_nesting_depth": 2.0,
    "abstraction_layer_count": 4.0,
    "immutability_score": 0.1,
    "error_handling_centralization_score": 0.4,
    "test_structure_modularity_ratio": 0.0
}"#).unwrap();

    println!("{:#?}", match_styles(target, vec![user1, user2, user3], None));
}
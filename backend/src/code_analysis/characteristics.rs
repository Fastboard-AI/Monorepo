#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct CodeCharacteristics {
    avg_lines_per_function: f32,
    functional_vs_oop_ratio: f32,
    recursion_vs_loop_ratio: f32,
    dependency_coupling_index: f32,
    modularity_index_score: f32,
    avg_nesting_depth: f32,
    abstraction_layer_count: f32,
    immutability_score: f32,
    error_handling_centralization_score: f32,
    test_structure_modularity_ratio: f32,
}

impl CodeCharacteristics {}

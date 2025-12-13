#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct CodeCharacteristics {
    pub avg_lines_per_function: f32,
    pub functional_vs_oop_ratio: f32,
    pub recursion_vs_loop_ratio: f32,
    pub dependency_coupling_index: f32,
    pub modularity_index_score: f32,
    pub avg_nesting_depth: f32,
    pub abstraction_layer_count: f32,
    pub immutability_score: f32,
    pub error_handling_centralization_score: f32,
    pub test_structure_modularity_ratio: f32,
}

impl CodeCharacteristics {}

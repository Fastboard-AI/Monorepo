#[derive(Debug, serde::Deserialize, serde::Serialize, Clone)]
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

    // Confidence metrics
    #[serde(default)]
    pub files_analyzed: u32,
    #[serde(default)]
    pub total_lines_analyzed: u32,
    #[serde(default)]
    pub languages_detected: Vec<String>,
}

impl CodeCharacteristics {
    pub fn with_confidence(
        mut self,
        files_analyzed: u32,
        total_lines_analyzed: u32,
        languages_detected: Vec<String>,
    ) -> Self {
        self.files_analyzed = files_analyzed;
        self.total_lines_analyzed = total_lines_analyzed;
        self.languages_detected = languages_detected;
        self
    }
}

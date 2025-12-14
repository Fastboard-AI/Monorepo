use rocket::{post, Data, http::ContentType};
use rocket::response::content::RawJson;
use rocket::data::ToByteUnit;
use serde::{Deserialize, Serialize};
use genai::{Client, chat::{ChatMessage, ChatRequest}};
use std::io::{Read, Cursor};

#[derive(Serialize, Deserialize)]
pub struct ParsedResume {
    pub name: String,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub location: Option<String>,
    pub title: Option<String>,
    pub summary: Option<String>,
    pub skills: Vec<SkillExtracted>,
    pub experience: Vec<ExperienceExtracted>,
    pub education: Vec<EducationExtracted>,
    pub github_url: Option<String>,
    pub linkedin_url: Option<String>,
    pub website_url: Option<String>,
    pub other_links: Vec<String>,
}

#[derive(Serialize, Deserialize)]
pub struct SkillExtracted {
    pub name: String,
    pub level: String,
}

#[derive(Serialize, Deserialize)]
pub struct ExperienceExtracted {
    pub title: String,
    pub company: String,
    pub duration: String,
    pub description: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct EducationExtracted {
    pub degree: String,
    pub institution: String,
    pub year: String,
    pub field: Option<String>,
}

const RESUME_EXTRACTION_PROMPT: &str = r#"Extract structured information from this resume text.

Return a JSON object with these fields:
{
  "name": "Full Name",
  "email": "email@example.com or null",
  "phone": "phone number or null",
  "location": "City, Country or null",
  "title": "Current/Most Recent Job Title or null",
  "summary": "Brief professional summary (1-2 sentences) or null",
  "skills": [
    {"name": "Skill Name", "level": "beginner|intermediate|advanced|expert"}
  ],
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "duration": "Start - End or duration",
      "description": "Brief description or null"
    }
  ],
  "education": [
    {
      "degree": "Degree Name",
      "institution": "School/University",
      "year": "Graduation year or date range",
      "field": "Field of study or null"
    }
  ],
  "github_url": "https://github.com/username or null",
  "linkedin_url": "https://linkedin.com/in/username or null",
  "website_url": "Personal website/portfolio URL or null",
  "other_links": ["any other relevant URLs"]
}

Guidelines:
- For skills, estimate level based on context (years mentioned, project complexity, etc.)
- Extract ALL URLs found - categorize GitHub, LinkedIn, and personal websites separately
- Personal websites include: portfolio sites, personal blogs, custom domains
- If no name is found, use "Unknown"
- Return ONLY valid JSON, no additional text

Resume text:
"#;

/// Extract text from a PDF file
fn extract_pdf_text(data: &[u8]) -> Result<String, String> {
    pdf_extract::extract_text_from_mem(data)
        .map_err(|e| format!("PDF extraction failed: {}", e))
}

/// Extract text from a DOCX file (it's a zip with XML inside)
fn extract_docx_text(data: &[u8]) -> Result<String, String> {
    let cursor = Cursor::new(data);
    let mut archive = zip::ZipArchive::new(cursor)
        .map_err(|e| format!("Failed to open DOCX: {}", e))?;

    let mut document_xml = archive.by_name("word/document.xml")
        .map_err(|e| format!("Failed to find document.xml: {}", e))?;

    let mut xml_content = String::new();
    document_xml.read_to_string(&mut xml_content)
        .map_err(|e| format!("Failed to read document.xml: {}", e))?;

    // Simple XML text extraction - remove tags and get text content
    let mut text = String::new();
    let mut in_tag = false;
    let mut last_was_space = false;

    for ch in xml_content.chars() {
        match ch {
            '<' => {
                in_tag = true;
                if !last_was_space && !text.is_empty() {
                    text.push(' ');
                    last_was_space = true;
                }
            }
            '>' => {
                in_tag = false;
            }
            _ if !in_tag => {
                if ch.is_whitespace() {
                    if !last_was_space && !text.is_empty() {
                        text.push(' ');
                        last_was_space = true;
                    }
                } else {
                    text.push(ch);
                    last_was_space = false;
                }
            }
            _ => {}
        }
    }

    // Decode XML entities
    let text = text
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&apos;", "'");

    Ok(text.trim().to_string())
}

/// Parse resume with Gemini
async fn parse_with_gemini(text: &str) -> Result<ParsedResume, String> {
    let client = Client::default();

    // Truncate if too long (Gemini has limits)
    let truncated = if text.len() > 30000 {
        &text[..30000]
    } else {
        text
    };

    let prompt = format!("{}{}", RESUME_EXTRACTION_PROMPT, truncated);
    let request = ChatRequest::new(vec![ChatMessage::user(prompt)]);

    let response = client
        .exec_chat("gemini-2.0-flash", request, None)
        .await
        .map_err(|e| format!("Gemini API error: {}", e))?;

    let content = response
        .first_text()
        .ok_or("No response from Gemini")?;

    // Extract JSON from response
    let json_str = if content.contains("```json") {
        content
            .split("```json")
            .nth(1)
            .and_then(|s| s.split("```").next())
            .unwrap_or(content)
    } else if content.contains("```") {
        content
            .split("```")
            .nth(1)
            .unwrap_or(content)
    } else {
        content
    };

    serde_json::from_str(json_str.trim())
        .map_err(|e| format!("Failed to parse JSON: {} - Response: {}", e, json_str))
}

#[post("/resumes/parse", data = "<data>")]
pub async fn parse_resume(content_type: &ContentType, data: Data<'_>) -> RawJson<String> {
    // Read the file data
    let bytes = match data.open(10.mebibytes()).into_bytes().await {
        Ok(b) if b.is_complete() => b.into_inner(),
        Ok(_) => return RawJson(r#"{"error": "File too large (max 10MB)"}"#.to_string()),
        Err(e) => return RawJson(format!(r#"{{"error": "Failed to read file: {}"}}"#, e)),
    };

    // Determine file type and extract text
    let text = if content_type.is_pdf() || bytes.starts_with(b"%PDF") {
        match extract_pdf_text(&bytes) {
            Ok(t) => t,
            Err(e) => return RawJson(format!(r#"{{"error": "{}"}}"#, e)),
        }
    } else if content_type.to_string().contains("wordprocessingml")
           || content_type.to_string().contains("msword")
           || bytes.starts_with(b"PK") // DOCX is a zip file
    {
        match extract_docx_text(&bytes) {
            Ok(t) => t,
            Err(e) => return RawJson(format!(r#"{{"error": "{}"}}"#, e)),
        }
    } else {
        // Try as plain text
        match String::from_utf8(bytes) {
            Ok(t) => t,
            Err(_) => return RawJson(r#"{"error": "Unsupported file format. Please upload PDF or DOCX."}"#.to_string()),
        }
    };

    if text.trim().is_empty() {
        return RawJson(r#"{"error": "Could not extract text from file"}"#.to_string());
    }

    // Parse with Gemini
    match parse_with_gemini(&text).await {
        Ok(parsed) => RawJson(serde_json::to_string(&parsed).unwrap()),
        Err(e) => RawJson(format!(r#"{{"error": "{}"}}"#, e)),
    }
}

/// Parse resume from raw text (for testing or alternative input)
#[post("/resumes/parse-text", data = "<text>")]
pub async fn parse_resume_text(text: String) -> RawJson<String> {
    if text.trim().is_empty() {
        return RawJson(r#"{"error": "Empty text provided"}"#.to_string());
    }

    match parse_with_gemini(&text).await {
        Ok(parsed) => RawJson(serde_json::to_string(&parsed).unwrap()),
        Err(e) => RawJson(format!(r#"{{"error": "{}"}}"#, e)),
    }
}

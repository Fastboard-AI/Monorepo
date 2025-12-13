use backend::code_analysis;
use dotenv::dotenv;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv()?;

    println!(
        "{:#?}",
        code_analysis::ai::generate_characteristics_from_repo("https://github.com/OzG71LXXeKVjzhP8LLWaYM4bo/2d-projectile-motion")
            .await?
    );

    Ok(())
}

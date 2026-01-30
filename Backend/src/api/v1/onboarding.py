import logging
import io
import requests
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, Request
from pydantic import BaseModel, HttpUrl
from src.core.memory import get_memory_client
from src.core.config import get_settings
import tweepy
import trafilatura
from pypdf import PdfReader
from docx import Document
from bs4 import BeautifulSoup
from bs4 import BeautifulSoup
from src.core.security import get_current_user, CurrentUser
from src.db.session import get_db_session
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from src.models.user import User

router = APIRouter(prefix="/onboarding", tags=["Onboarding"])
settings = get_settings()
logger = logging.getLogger(__name__)

class StyleProfile(BaseModel):
    tone: str
    emoji_usage: str
    sentence_style: str
    cta_style: str
    summary: str
    # Detailed Style Analysis Fields
    vocabulary: Optional[str] = None
    sentence_structure: Optional[str] = None
    pace_and_flow: Optional[str] = None
    tone_and_voice: Optional[str] = None
    formatting: Optional[str] = None
    influences: Optional[str] = None
    consistency: Optional[str] = None
    prompt_snippet: Optional[str] = None

class LLMStyleAnalysis(BaseModel):
    general_summary: str   
    twitter_profile: StyleProfile
    linkedin_profile: StyleProfile

class AnalysisResponse(BaseModel):
    # Map of platform name (e.g. 'twitter', 'linkedin', 'blog') to its specific profile
    platform_styles: dict[str, StyleProfile] 
    general_summary: str



def extract_text_from_pdf(file_content: bytes) -> str:
    try:
        reader = PdfReader(io.BytesIO(file_content))
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        return text.strip()
    except Exception as e:
        logger.error(f"Error extracting PDF: {e}")
        return ""

def extract_text_from_docx(file_content: bytes) -> str:
    try:
        doc = Document(io.BytesIO(file_content))
        return "\n".join([para.text for para in doc.paragraphs]).strip()
    except Exception as e:
        logger.error(f"Error extracting DOCX: {e}")
        return ""

def extract_text_from_html(file_content: bytes) -> str:
    try:
        return BeautifulSoup(file_content, "html.parser").get_text(separator=" ").strip()
    except Exception as e:
        logger.error(f"Error extracting HTML/TXT: {e}")
        return ""

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Upload a file (PDF, DOCX, TXT, MD) to extract writing style."""
    try:
        content = await file.read()
        text_content = ""
        
        filename = file.filename.lower()
        if filename.endswith(".pdf"):
            text_content = extract_text_from_pdf(content)
        elif filename.endswith(".docx"):
            text_content = extract_text_from_docx(content)
        elif filename.endswith(".txt") or filename.endswith(".md"):
            text_content = content.decode("utf-8")
        else:
            # Try plain text fallback or raise error
            try:
                text_content = content.decode("utf-8")
            except:
                raise HTTPException(status_code=400, detail="Unsupported file type")

        if not text_content.strip():
             raise HTTPException(status_code=400, detail="Could not extract text from file")

        memory = get_memory_client()
        memory.add(text_content, user_id=str(current_user.id), metadata={"source": file.filename, "type": "file"})
        
        return {"status": "success", "message": f"Processed {file.filename}"}
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error processing file: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/url")
async def process_url(
    url: str,
    current_user: CurrentUser = Depends(get_current_user)
):
    """Process a URL to extract writing style."""
    try:
        url_str = url.strip()
        if not url_str.startswith(("http://", "https://")):
            url_str = "https://" + url_str
            
        downloaded = trafilatura.fetch_url(url_str)
        text_content = ""
        
        if downloaded:
            text_content = trafilatura.extract(downloaded)
        
        if not text_content:
             # Fallback to older methods if trafilatura fails to grab main content
             try:
                 resp = requests.get(url_str, timeout=10)
                 if resp.status_code == 200:
                     soup = BeautifulSoup(resp.content, "html.parser")
                     # Remove scripts and styles
                     for script in soup(["script", "style"]):
                         script.decompose()
                     text_content = soup.get_text(separator=" ").strip()
             except Exception as e:
                 logger.error(f"Manual fallback fetch failed: {e}")

        if not text_content or not text_content.strip():
             # Last resort: Just store the URL
             # But user wants "proper" handling, so erroring might be better if we cant get CONTENT
             raise HTTPException(status_code=400, detail="Could not extract content from URL")
        
        memory = get_memory_client()
        memory.add(text_content, user_id=str(current_user.id), metadata={"source": url_str, "type": "url"})
        return {"status": "success", "message": f"Processed {url}"}

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error processing URL: {e}")
        raise HTTPException(status_code=500, detail=str(e))
        
@router.post("/text")
async def submit_text(
    text: str = Form(...),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Submit raw text (e.g., Q&A answers) to extract writing style."""
    try:
        user_id = str(current_user.id)
        if not text.strip():
             raise HTTPException(status_code=400, detail="Text cannot be empty")
        
        # Process synchronously to avoid 'File Lock' errors with local Mem0 storage
        # and to remove dependency on Redis/Dramatiq for basic onboarding.
        try:
            memory = get_memory_client()
            memory.add(text, user_id=user_id, metadata={"source": "questionnaire", "type": "text"})
            return {"status": "success", "message": "Text processed successfully", "mode": "sync"}
        except Exception as e:
            logger.error(f"Failed to save text content: {e}")
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error processing text: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_style(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    """Analyze stored memories to generate a style profile."""
    memory = get_memory_client()
    memories_response = memory.get_all(user_id=str(current_user.id))
    
    # Extract the results list from the response
    memories = memories_response.get("results", []) if isinstance(memories_response, dict) else []
    
    # Categorize memories
    user_style_docs = []
    twitter_docs = []
    linkedin_docs = []
    
    for m in memories:
        # Mem0 uses "memory" key, not "text"
        text = m.get("memory", "")
        if not text:
            continue
            
        metadata = m.get("metadata", {}) or {}
        source = metadata.get("source", "").lower()
        platform = metadata.get("platform", "").lower()
        
        # Check explicit platform tags first
        if platform == "twitter" or source == "twitter":
            twitter_docs.append(text)
        elif platform == "linkedin" or source == "linkedin":
            linkedin_docs.append(text)
        else:
            # Default to user_style for questionnaire, files, urls, etc.
            user_style_docs.append(text)
    
    user_style_context = "\n\n".join(user_style_docs)
    twitter_context = "\n\n".join(twitter_docs)
    linkedin_context = "\n\n".join(linkedin_docs)
    
    # Check if we do not have ANY data
    if not any([user_style_context, twitter_context, linkedin_context]):
        # Fallback if no data found
        default_profile = StyleProfile(
            tone="Neutral",
            emoji_usage="Moderate",
            sentence_style="Standard",
            cta_style="Clear",
            summary="No samples provided."
        )
        return AnalysisResponse(
            platform_styles={"twitter": default_profile, "linkedin": default_profile},
            general_summary="No writing samples found. Please upload content or answer questions to analyze your style."
        )

    try:
        from langchain_openai import ChatOpenAI
        from langchain_core.prompts import ChatPromptTemplate
        
        # We need a chat model
        llm = ChatOpenAI(
            api_key=settings.openai_api_key,
            model_name=settings.llm_model,
            temperature=0.1 # Low temp for strictly following schema
        )
        
        structured_llm = llm.with_structured_output(LLMStyleAnalysis)

        prompt_text = """
        You are an expert linguistic analyst specializing in extracting and codifying writing styles from user-provided data, with a focus on platform-specific adaptations. Your task is to analyze the provided data, which is separated into three categories:
        1. **User Style Inputs**: Answers to Q&A/Questionnaire, uploaded files, or generic writing samples.
        2. **Twitter/X Posts**: Actual posts from the user's Twitter/X history.
        3. **LinkedIn Posts**: Actual posts from the user's LinkedIn history.

        Create a comprehensive "Writing Style Profile" that captures every nuance of their overall style, plus specific breakdowns for Twitter and LinkedIn (and others if inferred).

        **Input Data:**
        ---
        **USER STYLE INPUTS (Q&A/Files):**
        {user_style}
        ---
        **TWITTER POSTS:**
        {twitter_posts}
        ---
        **LINKEDIN POSTS:**
        {linkedin_posts}
        ---

        **Key Guidelines for the Profile:**
        - **Structure**: 
            - **General Style Analysis**: Universal traits found across all inputs.
            - **Platform-Specific Adaptations**: 
                - **X/Twitter**: strict analysis of the provided Twitter posts (if any). If none, infer from General Style but note it's inferred.
                - **LinkedIn**: strict analysis of the provided LinkedIn posts (if any). If none, infer from General Style but note it's inferred.
        - **Anomalies & Specifics**: Look for unique quirks. If the user says one thing in Q&A but does another in actual posts, note this contradiction or "evolution".
        
        **Detailed Analysis Requirements (Must cover these aspects):**
        1. **Vocabulary and Word Choice**: Lexical preferences, formality, slang, emojis, abbreviations, overused/avoided words.
        2. **Sentence Structure and Syntax**: Length, complexity, voice (active/passive), use of fragments, questions, exclamations.
        3. **Tone, Voice, and Emotional Layering**: Overall tone, shifts by context, perspective (1st/2nd/3rd person), emotional subtlety.
        4. **Rhythm, Pacing, and Flow**: Sentence variety, repetition, transitions, overall readability feel.
        5. **Figurative Language and Creative Elements**: Metaphors, humor style, storytelling, quirks like alliteration.
        6. **Formatting, Punctuation, and Visual Style**: Punctuation effects, bold/italics, lists, hashtags, capitalization, media integration.
        7. **Influences, Evolution, and Adaptations**: External inspirations, style changes over time, audience-driven variations.
        8. **Overall Consistency and Uniqueness**: Scale of consistency (1-10), 3 adjectives describing the style, signature elements.

        **Mimicry Readiness**: End with a "Prompt Snippet" – a reusable template phrase for generation.

        Generate the Writing Style Profile now.
        """

        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are an expert social media strategist and linguist."),
            ("user", prompt_text)
        ])

        chain = prompt | structured_llm

        result = await chain.ainvoke({
            "user_style": user_style_context if user_style_context else "No specific general inputs provided.",
            "twitter_posts": twitter_context if twitter_context else "No specific Twitter posts provided.",
            "linkedin_posts": linkedin_context if linkedin_context else "No specific LinkedIn posts provided."
        })
        
        # Result is already a validated Pydantic model (LLMStyleAnalysis)
        
        # Store analysis results in memory for retrieval during generation
        # 1. General Summary
        memory.add(
            result.general_summary, 
            user_id=str(current_user.id), 
            metadata={"type": "style_summary", "source": "analysis"}
        )
        
        # 2. Twitter Profile (as JSON)
        memory.add(
            result.twitter_profile.model_dump_json(), 
            user_id=str(current_user.id), 
            metadata={"type": "style_profile", "platform": "twitter", "source": "analysis"}
        )
        
        # 3. LinkedIn Profile (as JSON)
        memory.add(
            result.linkedin_profile.model_dump_json(), 
            user_id=str(current_user.id), 
            metadata={"type": "style_profile", "platform": "linkedin", "source": "analysis"}
        )

        stmt = select(User).where(User.id == current_user.id)
        user = (await db.execute(stmt)).scalar_one_or_none()
        if user:
            user.is_onboarded = True
            await db.commit()

        return AnalysisResponse(
            platform_styles={
                "twitter": result.twitter_profile,
                "linkedin": result.linkedin_profile
            },
            general_summary=result.general_summary
        )
        
    except Exception as e:
        logger.error(f"LangChain Analysis failed: {e}")
        # Fallback
        fallback_profile = StyleProfile(
            tone="Professional (Fallback)",
            emoji_usage="Moderate",
            sentence_style="Mixed",
            cta_style="Direct",
            summary="Could not complete analysis."
        )
        return AnalysisResponse(
            platform_styles={"linkedin": fallback_profile, "twitter": fallback_profile},
            general_summary="Analysis failed. Using default profiles."
        )


@router.post("/finish")
async def finish_onboarding(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    """Mark onboarding as complete for the current user."""
    try:
        stmt = select(User).where(User.id == current_user.id)
        user = (await db.execute(stmt)).scalar_one_or_none()
        if user:
            user.is_onboarded = True
            await db.commit()
            return {"status": "success", "message": "Onboarding completed"}
        else:
            raise HTTPException(status_code=404, detail="User not found")
    except Exception as e:
        logger.error(f"Error finishing onboarding: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/connect/twitter")
async def connect_twitter(request: Request):
    """Initiate Twitter OAuth flow."""
    try:
        if not settings.x_client_id or not settings.x_client_secret:
             return {"url": f"{str(request.base_url)}api/v1/onboarding/connect/twitter/callback_simulated"}

        # Use dynamic base URL for callbacks
        backend_url = str(request.base_url).rstrip("/")
        callback_uri = f"{backend_url}/api/v1/onboarding/connect/twitter/callback"

        oauth2_user_handler = tweepy.OAuth2UserHandler(
            client_id=settings.x_client_id,
            redirect_uri=callback_uri,
            scope=["tweet.read", "users.read", "offline.access"],
            client_secret=settings.x_client_secret
        )
        url = oauth2_user_handler.get_authorization_url()
        return {"url": url}
    except Exception as e:
        logger.error(f"Error generating Twitter auth URL: {e}")
        raise HTTPException(status_code=500, detail=str(e))

from fastapi.responses import RedirectResponse

@router.get("/connect/twitter/callback")
async def twitter_callback(request: Request, code: str, state: Optional[str] = None, user_id: str = "default_user"):
    """Handle Twitter OAuth callback."""
    try:
        # Allow OAuth over HTTP for local development
        import os
        os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

        # Use dynamic base URL for callbacks
        backend_url = str(request.base_url).rstrip("/")
        callback_uri = f"{backend_url}/api/v1/onboarding/connect/twitter/callback"

        oauth2_user_handler = tweepy.OAuth2UserHandler(
            client_id=settings.x_client_id,
            redirect_uri=callback_uri,
            scope=["tweet.read", "users.read", "offline.access"],
            client_secret=settings.x_client_secret
        )
        access_token = oauth2_user_handler.fetch_token(code)
        
        client = tweepy.Client(access_token["access_token"])
        me = client.get_me()
        
        # Trigger background worker to fetch tweets
        from src.workers.twitter_worker import fetch_tweets_task
        fetch_tweets_task.send(access_token["access_token"], user_id)
        
        # Success Redirect
        # Strip query params to ensure clean slate
        base_frontend = settings.frontend_url
        return RedirectResponse(url=f"{base_frontend}?twitter_connected=true")

    except Exception as e:
        logger.error(f"Error in Twitter callback: {e}")
        base_frontend = settings.frontend_url
        return RedirectResponse(url=f"{base_frontend}?twitter_error=true")

@router.get("/connect/twitter/callback_simulated")
async def twitter_callback_simulated():
    """Simulated callback for demonstration."""
    settings = get_settings()
    base_frontend = settings.frontend_url.split("?")[0]
    return RedirectResponse(url=f"{base_frontend}?twitter_connected=true")


# --- LinkedIn Integration ---

@router.get("/connect/linkedin")
async def connect_linkedin(request: Request):
    """Initiate LinkedIn OAuth flow."""
    try:
        if not settings.linkedin_client_id or not settings.linkedin_client_secret:
             # Simulation for dev/demo if no keys
             return {"url": f"{str(request.base_url)}api/v1/onboarding/connect/linkedin/callback_simulated"}

        # LinkedIn OAuth2
        # Scope: openid, profile, email
        # Removed w_member_social temp to debug invalid_scope_error.
        # Ensure "Sign In with LinkedIn using OpenID Connect" product is enabled in Dev Portal.
        
        scopes = ["openid", "profile", "email"]
        scope_str = "%20".join(scopes)
        
        # Use dynamic base URL for callbacks
        backend_url = str(request.base_url).rstrip("/")
        redirect_uri = f"{backend_url}/api/v1/onboarding/connect/linkedin/callback"
        
        # State should be random for security, using simple string for now
        state = "linkedin_auth_state"
        
        auth_url = (
            f"https://www.linkedin.com/oauth/v2/authorization"
            f"?response_type=code"
            f"&client_id={settings.linkedin_client_id}"
            f"&redirect_uri={redirect_uri}"
            f"&state={state}"
            f"&scope={scope_str}"
        )
        
        return {"url": auth_url}
    except Exception as e:
        logger.error(f"Error generating LinkedIn auth URL: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/connect/linkedin/callback")
async def linkedin_callback(
    request: Request, 
    code: Optional[str] = None, 
    error: Optional[str] = None, 
    error_description: Optional[str] = None,
    state: Optional[str] = None, 
    user_id: str = "default_user"
):
    """Handle LinkedIn OAuth callback."""
    try:
        # Allow OAuth over HTTP for local development
        import os
        os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'
        
        backend_url = str(request.base_url).rstrip("/")
        
        # Check for error first
        if error:
            logger.error(f"LinkedIn Auth Error: {error} - {error_description}")
            base_frontend = settings.frontend_url
            return RedirectResponse(url=f"{base_frontend}?linkedin_error=true")
            
        if not code:
            logger.error("LinkedIn Auth Error: No code provided")
            base_frontend = settings.frontend_url
            return RedirectResponse(url=f"{base_frontend}?linkedin_error=true")

        redirect_uri = f"{backend_url}/api/v1/onboarding/connect/linkedin/callback"
        
        # Exchange code for access token
        token_url = "https://www.linkedin.com/oauth/v2/accessToken"
        data = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": redirect_uri,
            "client_id": settings.linkedin_client_id,
            "client_secret": settings.linkedin_client_secret,
        }
        
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        
        import httpx
        async with httpx.AsyncClient() as client:
            resp = await client.post(token_url, data=data, headers=headers)
            
            if resp.status_code != 200:
                logger.error(f"LinkedIn Token Error: {resp.text}")
                raise HTTPException(status_code=400, detail="Failed to retrieve LinkedIn token")
            
            token_data = resp.json()
            access_token = token_data.get("access_token")
            
            # Fetch User Profile (Optional, just to verify functionality for this task)
            # For posting, we just need the token.
            # Ideally, store this token securely associated with the user.
            # Trigger background fetching or just mark connected.
            
            # For now, we'll mimic Twitter flow and just succeed.
            # Real implementation would save token to DB.
            
            # Trigger background worker (if needed) or just return success
            # from src.workers.linkedin_worker import fetch_posts_task
            # fetch_posts_task.send(access_token, user_id)

        # Success Redirect
        # Strip query params to ensure clean slate
        base_frontend = settings.frontend_url
        return RedirectResponse(url=f"{base_frontend}?linkedin_connected=true")

    except Exception as e:
        logger.error(f"Error in LinkedIn callback: {e}")
        base_frontend = settings.frontend_url
        return RedirectResponse(url=f"{base_frontend}?linkedin_error=true")

@router.get("/connect/linkedin/callback_simulated")
async def linkedin_callback_simulated():
    """Simulated callback for demonstration."""
    settings = get_settings()
    base_frontend = settings.frontend_url
    return RedirectResponse(url=f"{base_frontend}?linkedin_connected=true")

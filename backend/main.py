import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import aiohttp
import json
import uuid
import logging
import traceback
from typing import List
from datetime import datetime
import asyncio

app = FastAPI()

# CORSの設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Anthropic APIキー
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

# ロガーの設定
logging.basicConfig(filename='../memory/app.log', level=logging.INFO)
logger = logging.getLogger(__name__)

# リクエストボディの型定義
class TextRequest(BaseModel):
    textA: str
    textB: str

# レスポンスの型定義
class StructuredText(BaseModel):
    id: int
    type: str
    content: str

class StructureResponse(BaseModel):
    processId: str
    structuredA: List[StructuredText]
    structuredB: List[StructuredText]

async def make_request_with_retry(session, url, headers, data, max_retries=3):
    for attempt in range(max_retries):
        try:
            async with session.post(url, headers=headers, json=data, timeout=120) as response:
                response.raise_for_status()
                return await response.text()  # レスポンスをテキストとして返す
        except asyncio.TimeoutError:
            if attempt == max_retries - 1:
                raise
            await asyncio.sleep(2 ** attempt)  # Exponential backoff
        except aiohttp.ClientResponseError as e:
            if e.status >= 500:  # Retry on server errors
                if attempt == max_retries - 1:
                    raise
                await asyncio.sleep(2 ** attempt)
            else:
                raise

# Claudeを使用してテキストを構造化する関数
async def structure_text_with_claude(text: str, process_id: str) -> List[StructuredText]:
    async with aiohttp.ClientSession() as session:
        try:
            raw_response = await make_request_with_retry(
                session,
                "https://api.anthropic.com/v1/messages",
                headers={
                    "Content-Type": "application/json",
                    "X-API-Key": ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01"
                },
                data={
                    "model": "claude-3-sonnet-20240229",
                    "max_tokens": 1000,
                    "messages": [
                        {"role": "user", "content": f"Please structure the following text into sections. Respond with a JSON array where each element has 'id', 'type', and 'content' keys. The 'type' should describe the section(e.g, Abstracts, Introduction, Prior Studies, Assignment, Issue 1, Issue 2, Issue 3, Assertion, Purpose, Proposal, Result of proposal 1, Result of proposal 2, Proposal Result 3,  References). Here's the text:\n\n{text} ["}
                    ]
                }
            )
            
            # デバッグ: 生のレスポンスをログに記録
            logger.info(f"Raw API Response: {raw_response}")
            
            if not raw_response:
                raise ValueError("Empty response from API")
            
            response_data = json.loads(raw_response)
            
            # デバッグ: パースされたレスポンスデータをログに記録
            logger.info(f"Parsed API Response: {response_data}")
            
            content = response_data["content"][0]["text"]
            
            # デバッグ: コンテンツの内容をログに記録
            logger.info(f"Content to parse: {content}")

            json_str = content.split("JSON array:\n\n", 1)[-1].strip()
            logger.info(f"Extracted JSON string: {json_str}")

            structured_text = json.loads(content)
            return [StructuredText(**item) for item in structured_text]
        except json.JSONDecodeError as e:
            error_msg = f"JSON Decode Error: {str(e)}\nRaw response: {raw_response}"
            logger.error(error_msg)
            with open(f"../memory/{process_id}.log", "a") as f:
                f.write(f"{datetime.now()}: {error_msg}\n")
            raise HTTPException(status_code=500, detail=error_msg)
        except KeyError as e:
            error_msg = f"KeyError: {str(e)}\nResponse data: {response_data}"
            logger.error(error_msg)
            with open(f"../memory/{process_id}.log", "a") as f:
                f.write(f"{datetime.now()}: {error_msg}\n")
            raise HTTPException(status_code=500, detail=error_msg)
        except ValueError as e:
            error_msg = f"Value Error: {str(e)}"
            logger.error(error_msg)
            with open(f"../memory/{process_id}.log", "a") as f:
                f.write(f"{datetime.now()}: {error_msg}\n")
            raise HTTPException(status_code=500, detail=error_msg)
        except asyncio.TimeoutError:
            error_msg = "Timeout while connecting to Anthropic API after multiple retries"
            logger.error(error_msg)
            with open(f"../memory/{process_id}.log", "a") as f:
                f.write(f"{datetime.now()}: {error_msg}\n")
            raise HTTPException(status_code=504, detail=error_msg)
        except aiohttp.ClientResponseError as e:
            error_msg = f"HTTP error occurred: {e.message}"
            logger.error(error_msg)
            with open(f"../memory/{process_id}.log", "a") as f:
                f.write(f"{datetime.now()}: {error_msg}\n")
            raise HTTPException(status_code=e.status, detail=error_msg)
        except Exception as e:
            error_msg = f"Unexpected error: {str(e)}\nRaw response: {raw_response if 'raw_response' in locals() else 'N/A'}"
            logger.error(error_msg)
            with open(f"../memory/{process_id}.log", "a") as f:
                f.write(f"{datetime.now()}: {error_msg}\n")
            raise HTTPException(status_code=500, detail=error_msg)

@app.post("/structure_texts", response_model=StructureResponse)
async def structure_texts(request: TextRequest):
    process_id = str(uuid.uuid4())
    logger.info(f"Started process {process_id}")
    
    with open(f"../memory/{process_id}.log", "w") as f:
        f.write(f"{datetime.now()}: Process started\n")
    
    try:
        structured_a = await structure_text_with_claude(request.textA, process_id)
        structured_b = await structure_text_with_claude(request.textB, process_id)
        
        logger.info(f"Completed process {process_id}")
        with open(f"../memory/{process_id}.log", "a") as f:
            f.write(f"{datetime.now()}: Process completed\n")
        
        return StructureResponse(processId=process_id, structuredA=structured_a, structuredB=structured_b)
    except Exception as e:
        error_msg = f"Error in process {process_id}: {str(e)}\n"
        error_msg += f"Exception type: {type(e).__name__}\n"
        error_msg += f"Exception traceback:\n{traceback.format_exc()}"
        logger.error(error_msg)
        with open(f"../memory/{process_id}.log", "a") as f:
            f.write(f"{datetime.now()}: {error_msg}\n")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=error_msg)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
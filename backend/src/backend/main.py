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

    def dict(self):
        return {
            "id": self.id,
            "type": self.type,
            "content": self.content
        }

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
async def structure_text_with_claude(text: str, process_id: str, previous_structure: str = None) -> List[StructuredText]:
    async with aiohttp.ClientSession() as session:
        try:
            prompt = \
            """
            The sentence should be divided into no more than 10 meaningful units. Answers should be in JSON format only, and should be divided into id, type, and content, where type is a word that represents the meaning of the content divided throughout the sentence. For example, things that are the same in SEASON, such as spring, summer, autumn, and winter, should be classified with detailed snake cases, such as season_spring, season_summer, season_autumn season_winter. It is better to split xxx_research_step, xxx_brain-storming_process if abstract and common names are used.
            If a meaningful division unit is of the same concept as the previous division example shown next, it should be used.
            Translated with www.DeepL.com/Translator (free version)
            """
            
            if previous_structure:
                prompt += f"Example of previous structuring (Optional) \n {previous_structure}"
            
            prompt += f"\n\nHere's the text to structure:\n\n{text}"

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
                    "max_tokens": 4096,
                    "temperature": 0.1,
                    "messages": [
                        {"role": "user", "content": prompt}
                    ]
                }
            )
            
            logger.info(f"Raw API Response: {raw_response}")
            
            response_data = json.loads(raw_response)
            logger.info(f"Parsed API Response: {response_data}")
            
            content = response_data["content"][0]["text"]
            logger.info(f"Content to parse: {content}")
            
            # JSON文字列を抽出する改善されたメソッド
            json_str = content.split("[", 1)[-1].rsplit("]", 1)[0]
            json_str = "[" + json_str + "]"
            logger.info(f"Extracted JSON string: {json_str}")
            
            structured_text = json.loads(json_str)
            result = [StructuredText(**item) for item in structured_text]

            debug_info = f"Structured text:\n{json.dumps(structured_text, ensure_ascii=False, indent=2)}\n"
            with open(f"../memory/{process_id}.log", "a") as f:
                f.write(f"{datetime.now()}: {debug_info}\n")

            return result


        except Exception as e:
            error_msg = f"Error: {str(e)}\n"
            logger.error(error_msg)
            with open(f"../memory/{process_id}.log", "a") as f:
                f.write(f"{datetime.now()}: {error_msg}\n")
            raise

@app.post("/structure_texts", response_model=StructureResponse)
async def structure_texts(request: TextRequest):
    process_id = str(uuid.uuid4())
    logger.info(f"Started process {process_id}")
    
    with open(f"../memory/{process_id}.log", "w") as f:
        f.write(f"{datetime.now()}: Process started\n")
    
    try:
        with open(f"../memory/{process_id}.log", "a") as f:
            f.write(f"{datetime.now()}: Structuring text A\n")
        structured_a = await structure_text_with_claude(request.textA, process_id)
        
        structured_a_dict = [item.dict() for item in structured_a]
        previous_structure = json.dumps(structured_a_dict, ensure_ascii=False, indent=2)
        
        with open(f"../memory/{process_id}.log", "a") as f:
            f.write(f"{datetime.now()}: Structuring text B\n")
        structured_b = await structure_text_with_claude(request.textB, process_id, previous_structure)
        
        logger.info(f"Completed process {process_id}")
        with open(f"../memory/{process_id}.log", "a") as f:
            f.write(f"{datetime.now()}: Process completed\n")
        
        return StructureResponse(processId=process_id, structuredA=structured_a, structuredB=structured_b)

    except Exception as e:
        error_msg = f"Error in process {process_id}: {str(e)}\n"
        logger.error(error_msg)
        with open(f"../memory/{process_id}.log", "a") as f:
            f.write(f"{datetime.now()}: {error_msg}\n")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/debug_info/{process_id}")
async def get_debug_info(process_id: str):
    try:
        log_path = f"../memory/{process_id}.log"
        last_modified = os.path.getmtime(log_path)
        with open(log_path, "r") as f:
            debug_info = f.read()
        return {"debug_info": debug_info, "last_modified": last_modified}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Debug info not found")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
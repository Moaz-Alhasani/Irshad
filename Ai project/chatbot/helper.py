import sqlite3
import json
from google import genai
from langchain_community.document_loaders import TextLoader, DirectoryLoader
from langchain_community.vectorstores import FAISS
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain.embeddings import HuggingFaceEmbeddings
from langchain_core.documents import Document

import os 


def load_data_json(data_path):
    docs = []

    for root, _, files in os.walk(data_path):
        for file in files:
            if file.endswith(".json"):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        json_data = json.load(f)

                    for item in json_data:
                        question = item.get("question", "")
                        answer = item.get("answer", "")
                        content = f"Question: {question}\nAnswer: {answer}"
                        doc = Document(
                            page_content=content,
                            metadata={"source": file}
                        )
                        docs.append(doc)

                except UnicodeDecodeError:
                    print(f"⚠️ تخطي الملف {file_path} بسبب ترميز غير مدعوم")
                except Exception as e:
                    print(f"⚠️ تخطي الملف {file_path} بسبب خطأ: {e}")

    print(f"✅ تم تحميل {len(docs)} سؤال/جواب من {data_path}")
    return docs


def text_splitter(docs):
    splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=20)
    return splitter.split_documents(docs)



def load_embedding_model():
    embeddings = HuggingFaceEmbeddings(model_name="./all-MiniLM-L6-v2")
    return embeddings



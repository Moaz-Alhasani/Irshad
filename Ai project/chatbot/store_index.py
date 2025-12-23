from src.helper import load_data_json,text_splitter,load_embedding_model
from dotenv import load_dotenv
from google import genai
from langchain_community.vectorstores import FAISS
import os 

load_dotenv()
API_KEY=os.environ.get("GOOGLE_API")
client = genai.Client(api_key=API_KEY)

data=load_data_json('./data')
text_chunk=text_splitter(data)
embeddings=load_embedding_model()
vectorstore = FAISS.load_local("faiss_index_saved", embeddings, allow_dangerous_deserialization=True)
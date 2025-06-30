from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional
import os
import json
import base64
from datetime import datetime, timedelta
from jose import JWTError, jwt

from webauthn import (
    generate_registration_options,
    verify_registration_response,
    generate_authentication_options,
    verify_authentication_response,
    options_to_json,
)
from webauthn.helpers.cose import COSEAlgorithmIdentifier
from webauthn.helpers.structs import (
    AuthenticatorSelectionCriteria,
    UserVerificationRequirement,
    AuthenticatorAttachment,
    ResidentKeyRequirement,
    PublicKeyCredentialCreationOptions,
    PublicKeyCredentialRequestOptions,
)

from ..database import get_db
from ..models import User, WebAuthnCredential, JST
from ..schemas import (
    UserCreate,
    UserResponse,
    WebAuthnRegistrationStartRequest,
    WebAuthnRegistrationStartResponse,  
    WebAuthnRegistrationCompleteRequest,
    WebAuthnRegistrationCompleteResponse,
    WebAuthnAuthenticationStartRequest,
    WebAuthnAuthenticationStartResponse,
    WebAuthnAuthenticationCompleteRequest,
    WebAuthnAuthenticationCompleteResponse,
    CurrentUserResponse,
)

router = APIRouter(prefix="/api/auth", tags=["authentication"])

# 環境変数
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# 環境に応じた設定
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

if ENVIRONMENT == "development":
    # ローカル開発環境設定
    RP_ID = os.getenv("RP_ID", "localhost")
    RP_NAME = os.getenv("RP_NAME", "Voice Diary (Dev)")
    ORIGIN = os.getenv("ORIGIN", "http://localhost:3000")
else:
    # 本番環境設定
    RP_ID = os.getenv("RP_ID", "diary.homelab.local")
    RP_NAME = os.getenv("RP_NAME", "Voice Diary")
    ORIGIN = os.getenv("ORIGIN", "https://diary.homelab.local")

# JWT認証
security = HTTPBearer()

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
            )
        return user_id
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )

def get_current_user(user_id: str = Depends(verify_token), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return user

# WebAuthn 登録開始
@router.post("/register/start", response_model=WebAuthnRegistrationStartResponse)
async def start_registration(
    request: WebAuthnRegistrationStartRequest,
    db: Session = Depends(get_db)
):
    # 既存ユーザーチェック
    existing_user = db.query(User).filter(User.username == request.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )
    
    # 新しいユーザー作成
    user = User(
        username=request.username,
        display_name=request.display_name or request.username
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # WebAuthn 登録オプション生成
    registration_options = generate_registration_options(
        rp_id=RP_ID,
        rp_name=RP_NAME,
        user_id=str(user.id).encode(),
        user_name=user.username,
        user_display_name=user.display_name,
        authenticator_selection=AuthenticatorSelectionCriteria(
            authenticator_attachment=AuthenticatorAttachment.PLATFORM,
            resident_key=ResidentKeyRequirement.PREFERRED,
            user_verification=UserVerificationRequirement.REQUIRED,
        ),
        supported_pub_key_algs=[
            COSEAlgorithmIdentifier.ECDSA_SHA_256,
            COSEAlgorithmIdentifier.RSASSA_PKCS1_v1_5_SHA_256,
        ],
    )
    
    # チャレンジをセッションに保存（実際の実装では Redis等を使用）
    challenge = base64.urlsafe_b64encode(registration_options.challenge).decode()
    
    return WebAuthnRegistrationStartResponse(
        challenge=challenge,
        user_id=str(user.id),
        rp_id=RP_ID,
        rp_name=RP_NAME,
        options=json.loads(options_to_json(registration_options))
    )

# WebAuthn 登録完了
@router.post("/register/complete", response_model=WebAuthnRegistrationCompleteResponse)
async def complete_registration(
    request: WebAuthnRegistrationCompleteRequest,
    db: Session = Depends(get_db)
):
    try:
        print(f"Registration complete request: {request}")
        
        # ユーザー取得
        user = db.query(User).filter(User.id == request.user_id).first()
        if not user:
            print(f"User not found: {request.user_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        print(f"Found user: {user.username}")
        
        # 認証情報を保存（簡略化された実装）
        try:
            credential_id_bytes = base64.urlsafe_b64decode(request.credential_id + '==')  # パディング追加
            attestation_bytes = base64.urlsafe_b64decode(request.attestation_object + '==')  # パディング追加
        except Exception as decode_error:
            print(f"Base64 decode error: {decode_error}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid base64 encoding: {str(decode_error)}"
            )
        
        credential = WebAuthnCredential(
            user_id=user.id,
            credential_id=credential_id_bytes,
            public_key=attestation_bytes,
            device_name=request.device_name or "Unknown Device",
            device_type="platform"
        )
        
        db.add(credential)
        db.commit()
        
        print(f"Registration completed for user: {user.username}")
        
        return WebAuthnRegistrationCompleteResponse(
            success=True,
            user_id=user.id,
            message="Registration completed successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Registration error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Registration failed: {str(e)}"
        )

# WebAuthn 認証開始
@router.post("/login/start", response_model=WebAuthnAuthenticationStartResponse)
async def start_authentication(
    request: WebAuthnAuthenticationStartRequest,
    db: Session = Depends(get_db)
):
    # 認証オプション生成
    authentication_options = generate_authentication_options(
        rp_id=RP_ID,
        user_verification=UserVerificationRequirement.REQUIRED,
    )
    
    challenge = base64.urlsafe_b64encode(authentication_options.challenge).decode()
    
    return WebAuthnAuthenticationStartResponse(
        challenge=challenge,
        options=json.loads(options_to_json(authentication_options))
    )

# WebAuthn 認証完了
@router.post("/login/complete", response_model=WebAuthnAuthenticationCompleteResponse)
async def complete_authentication(
    request: WebAuthnAuthenticationCompleteRequest,
    response: Response,
    db: Session = Depends(get_db)
):
    try:
        print(f"Authentication complete request: {request}")
        
        # 認証情報検索
        try:
            credential_id_bytes = base64.urlsafe_b64decode(request.credential_id + '==')  # パディング追加
        except Exception as decode_error:
            print(f"Credential ID decode error: {decode_error}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid credential ID encoding: {str(decode_error)}"
            )
        
        credential = db.query(WebAuthnCredential).filter(
            WebAuthnCredential.credential_id == credential_id_bytes
        ).first()
        
        if not credential:
            print(f"Credential not found for ID: {request.credential_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Credential not found"
            )
        
        print(f"Found credential for user_id: {credential.user_id}")
        
        # ユーザー取得
        user = db.query(User).filter(User.id == credential.user_id).first()
        if not user or not user.is_active:
            print(f"User not found or inactive: {credential.user_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found or inactive"
            )
        
        print(f"Found user: {user.username}")
        
        # 最終ログイン時刻更新
        user.last_login = datetime.now(JST)
        credential.last_used = datetime.now(JST)
        db.commit()
        
        # JWT トークン生成
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(user.id)},
            expires_delta=access_token_expires
        )
        
        # HTTP-only Cookie設定
        response.set_cookie(
            key="access_token",
            value=f"Bearer {access_token}",
            httponly=True,
            secure=True,
            samesite="lax",
            max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
        
        print(f"Authentication successful for user: {user.username}")
        
        return WebAuthnAuthenticationCompleteResponse(
            success=True,
            user=UserResponse.model_validate(user),
            access_token=access_token,
            message="Authentication successful"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Authentication error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Authentication failed: {str(e)}"
        )

# ログアウト
@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(key="access_token")
    return {"message": "Logged out successfully"}

# 現在のユーザー取得
@router.get("/me", response_model=CurrentUserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    return CurrentUserResponse(
        user=UserResponse.model_validate(current_user),
        authenticated=True
    )

# ユーザー一覧（管理者のみ）
@router.get("/users", response_model=list[UserResponse])
async def get_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    users = db.query(User).all()
    return [UserResponse.model_validate(user) for user in users]
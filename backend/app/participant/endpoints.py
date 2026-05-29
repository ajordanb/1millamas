from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Request, UploadFile
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.participant.model import (
    Discipline,
    ParticipantCreate,
    ParticipantOut,
    ParticipantSelfUpdate,
    ProofUrlOut,
)
from app.auth.model import Policy
from app.auth.service import SecurityService
from app.participant.service import ParticipantService
from app.tasks.background_tasks import send_race_registration_email_task
from app.user.model import User
from app.utills.dependencies import (
    current_user,
    get_email_service,
    get_participant_service,
    get_storage_service,
)
from app.utills.email.email import EmailService
from app.utills.storage.storage import StorageService

limiter = Limiter(key_func=get_remote_address)

# Used only to read the subject from a bearer token for per-user rate limiting.
_security = SecurityService(password_policy=Policy())


def user_rate_key(request: Request) -> str:
    """Rate-limit key: the authenticated user (by email) when a valid token is
    present, otherwise the client IP. Lets us cap actions per-account."""
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        try:
            token = _security.validate_access_token(auth[7:])
            return f"user:{token.sub}"
        except Exception:
            pass
    return get_remote_address(request)


participant_router = APIRouter(tags=["Participants"], prefix="/participant")


def _require_verified(user: User) -> None:
    """Race registration (and uploads) require a confirmed email address."""
    if not user.email_confirmed:
        raise HTTPException(
            status_code=403,
            detail="Please verify your email address before registering for the race.",
        )


@participant_router.get("/me", response_model=ParticipantOut | None)
async def get_my_registration(
    user: User = Depends(current_user),
    service: ParticipantService = Depends(get_participant_service),
) -> ParticipantOut | None:
    """Return the current user's race registration, or null if not registered yet."""
    doc = await service.get_me(user.email)
    return ParticipantOut.from_doc(doc) if doc else None


@participant_router.get("/me/proof-url", response_model=ProofUrlOut)
async def my_proof_url(
    user: User = Depends(current_user),
    service: ParticipantService = Depends(get_participant_service),
    storage: StorageService = Depends(get_storage_service),
) -> ProofUrlOut:
    """Return a short-lived signed URL to view your own donation screenshot."""
    doc = await service.get_me(user.email)
    if not doc or not doc.donation_proof_url:
        raise HTTPException(status_code=404, detail="No donation proof on file.")
    return ProofUrlOut(url=storage.view_url(doc.donation_proof_url))


@participant_router.post("/register", response_model=ParticipantOut)
@limiter.limit("1/day", key_func=user_rate_key)  # one registration per account per day
@limiter.limit("5/minute", key_func=get_remote_address)  # per-IP abuse cap
async def register_for_race(
    request: Request,
    bg: BackgroundTasks,
    full_name: str = Form(...),
    display_name: str = Form(...),
    discipline: Discipline = Form(...),
    city: str | None = Form(None),
    phone: str | None = Form(None),
    donation_proof: UploadFile = File(..., description="Screenshot of your GoFundMe donation"),
    user: User = Depends(current_user),
    service: ParticipantService = Depends(get_participant_service),
    storage: StorageService = Depends(get_storage_service),
    email_service: EmailService = Depends(get_email_service),
) -> ParticipantOut:
    """Sign up for the race. Requires a logged-in, email-verified user. Auto-approved on upload.

    Sends a confirmation email containing the Strava group link and the
    discipline's challenge link so the member can join and track distance.
    """
    _require_verified(user)
    proof_url = await storage.save_image(donation_proof)
    data = ParticipantCreate(
        full_name=full_name,
        display_name=display_name,
        discipline=discipline,
        city=city,
        phone=phone,
    )
    doc = await service.register(user.email, data, proof_url)

    bg.add_task(
        send_race_registration_email_task,
        email_service,
        str(doc.user_email),
        doc.full_name,
        doc.discipline.value,
        doc.goal_km,
    )
    return ParticipantOut.from_doc(doc)


@participant_router.put("/me", response_model=ParticipantOut)
@limiter.limit("20/minute")
async def update_my_registration(
    request: Request,
    full_name: str | None = Form(None),
    display_name: str | None = Form(None),
    discipline: Discipline | None = Form(None),
    city: str | None = Form(None),
    phone: str | None = Form(None),
    donation_proof: UploadFile | None = File(None),
    user: User = Depends(current_user),
    service: ParticipantService = Depends(get_participant_service),
    storage: StorageService = Depends(get_storage_service),
) -> ParticipantOut:
    """Update your own registration (optionally re-upload the donation screenshot)."""
    _require_verified(user)
    proof_url = None
    if donation_proof is not None:
        proof_url = await storage.save_image(donation_proof)
    data = ParticipantSelfUpdate(
        full_name=full_name,
        display_name=display_name,
        discipline=discipline,
        city=city,
        phone=phone,
    )
    doc = await service.update_me(user.email, data, donation_proof_url=proof_url)
    return ParticipantOut.from_doc(doc)

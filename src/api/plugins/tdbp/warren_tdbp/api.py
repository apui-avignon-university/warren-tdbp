"""Warren API v1 tdbp router."""

import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, status
from ralph.exceptions import HTTPException, LrsClientException

from .indicators import SlidingWindow, ScoreIndicator

router = APIRouter(
    prefix="/tdbp",
)

logger = logging.getLogger(__name__)


@router.get("/window")
async def get_sliding_window(
    until: datetime,
    course_id: str,
):
    """Return course sliding window indicator."""
    indicator = SlidingWindow(course_id=course_id, until=until)

    logger.debug("Start computing 'window' indicator")
    try:
        results = indicator.get_or_compute()
    except (KeyError, AttributeError, LrsClientException) as exception:
        message = "An error occurred while computing sliding window"
        logger.exception("%s. Exception:", message)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=message
        ) from exception

    logger.debug("Finish computing 'window' indicator")
    return results


@router.get("/score")
async def get_score(until: datetime, course_id: str, student_id: Optional[str] = None):
    """Return student or cohort score."""
    logger.debug("Start computing 'score' indicator")
    indicator = ScoreIndicator(course_id=course_id, until=until, student_id=student_id)

    try:
        results = indicator.get_or_compute()
    except (KeyError, AttributeError, LrsClientException) as exception:
        message = "An error occurred while computing student score(s)"
        logger.exception("%s. Exception:", message)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=message
        ) from exception

    logger.debug("Finish computing 'score' indicator")
    return results

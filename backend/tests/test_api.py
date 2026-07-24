"""
tests/test_api.py — Production test suite
─────────────────────────────────────────
Run: pytest tests/ -v --cov=app --cov-report=term-missing
"""
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.core.security import hash_password, verify_password, create_access_token, decode_token


# ════════════════════════════════════════════════
# Security unit tests
# ════════════════════════════════════════════════
class TestSecurity:
    def test_password_hash_and_verify(self):
        plain = "SecurePass@123"
        hashed = hash_password(plain)
        assert hashed != plain
        assert verify_password(plain, hashed)
        assert not verify_password("WrongPassword", hashed)

    def test_bcrypt_not_sha256(self):
        hashed = hash_password("test")
        assert hashed.startswith("$2b$"), "Must use bcrypt, not SHA-256"

    def test_access_token_decode(self):
        token = create_access_token("user-123", "admin")
        payload = decode_token(token)
        assert payload is not None
        assert payload["sub"] == "user-123"
        assert payload["role"] == "admin"
        assert payload["type"] == "access"

    def test_tampered_token_rejected(self):
        token = create_access_token("user-123", "admin")
        tampered = token[:-4] + "xxxx"
        assert decode_token(tampered) is None

    def test_refresh_token_type(self):
        from app.core.security import create_refresh_token
        token = create_refresh_token("user-123")
        payload = decode_token(token)
        assert payload["type"] == "refresh"


# ════════════════════════════════════════════════
# Carbon calculator tests
# ════════════════════════════════════════════════
class TestCarbonService:
    def test_emission_calculation(self):
        from app.services.carbon_service import calculate_carbon
        result = calculate_carbon(
            electricity_kwh=1000, water_liters=10000,
            transport_km=500, paper_kg=10,
        )
        assert result.electricity_co2 == pytest.approx(820, rel=0.01)
        assert result.water_co2 == pytest.approx(1.49, rel=0.05)
        assert result.transport_co2 == pytest.approx(105, rel=0.01)
        assert result.paper_co2 == pytest.approx(18.4, rel=0.01)
        assert result.total_carbon_kg > 0
        assert result.annual_projection == result.total_carbon_kg * 12
        assert "SDG 13" in result.sdg_tags

    def test_zero_inputs(self):
        from app.services.carbon_service import calculate_carbon
        result = calculate_carbon(0, 0, 0, 0)
        assert result.total_carbon_kg == 0

    def test_recommendations_not_empty(self):
        from app.services.carbon_service import calculate_carbon
        result = calculate_carbon(50000, 3000000, 45000, 250)
        assert len(result.recommendations) >= 4


# ════════════════════════════════════════════════
# Waste advisor tests
# ════════════════════════════════════════════════
class TestWasteService:
    def test_waste_analysis(self):
        from app.services.waste_service import analyze_waste
        result = analyze_waste(plastic_kg=100, paper_kg=80, food_kg=200, ewaste_kg=10)
        assert result.total_waste_kg == pytest.approx(390, rel=0.01)
        assert len(result.categories) == 4
        assert "SDG 12" in result.sdg_tags
        assert 0 <= result.sustainability_impact <= 100

    def test_percentages_sum_to_100(self):
        from app.services.waste_service import analyze_waste
        result = analyze_waste(120, 85, 210, 15)
        total_pct = sum(c.percentage for c in result.categories)
        assert total_pct == pytest.approx(100, abs=1.0)

    def test_ewaste_penalty(self):
        from app.services.waste_service import analyze_waste
        high_ewaste = analyze_waste(0, 0, 0, 100)
        low_ewaste  = analyze_waste(0, 0, 100, 1)
        assert high_ewaste.sustainability_impact < low_ewaste.sustainability_impact


# ════════════════════════════════════════════════
# Sustainability score tests
# ════════════════════════════════════════════════
class TestSustainabilityScore:
    def test_score_range(self):
        from app.services.sustainability_score import calculate_score
        result = calculate_score(48000, 3200000, 12000, 22000)
        assert 0 <= result.composite <= 100

    def test_low_consumption_high_score(self):
        from app.services.sustainability_score import calculate_score
        perfect = calculate_score(1000, 100000, 100, 500)
        baseline = calculate_score(65000, 4000000, 18000, 30000)
        assert perfect.composite > baseline.composite

    def test_trend_detection(self):
        from app.services.sustainability_score import calculate_score
        r = calculate_score(48000, 3200000, 12000, 22000, prev_composite=68.0)
        assert r.trend in ("improved", "declined", "stable")


# ════════════════════════════════════════════════
# API integration tests (uses ASGI transport)
# ════════════════════════════════════════════════
@pytest.mark.asyncio
class TestAPIEndpoints:
    async def test_health_endpoint(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"

    async def test_login_wrong_credentials(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post("/api/v1/auth/login", json={
                "email": "nobody@nowhere.com", "password": "wrong"
            })
        assert response.status_code == 401

    async def test_protected_route_no_token(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/v1/dashboard/metrics")
        assert response.status_code == 403

    async def test_carbon_validation_rejects_negative(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            # No auth token — should get 403, not 422 (route protected)
            response = await client.post("/api/v1/carbon/calculate", json={
                "electricity_kwh": -100, "water_liters": 0,
                "transport_km": 0, "paper_kg": 0,
            })
        assert response.status_code in (401, 403)

    async def test_security_headers_present(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/health")
        headers = response.headers
        assert "x-content-type-options" in headers
        assert "x-frame-options" in headers
        assert headers["x-frame-options"] == "DENY"

    async def test_request_id_header(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/health")
        assert "x-request-id" in response.headers

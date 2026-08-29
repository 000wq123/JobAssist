"""Focused tests for company-logo domain resolution."""

from app.api.routes.logo_proxy import _company_domains


def test_company_domain_prefers_specific_full_name():
    domains = _company_domains("Anton Proksch Institut – API Betriebs gemeinnützige GmbH")

    assert domains[0] == "antonprokschinstitut.at"
    assert domains.index("antonprokschinstitut.at") < domains.index("anton.at")


def test_job_board_url_is_never_used_as_company_logo_domain():
    domains = _company_domains(
        "Bosch Group",
        "https://www.adzuna.at/details/123456789",
    )

    assert "adzuna.at" not in domains
    assert domains[0] == "bosch.at"


def test_direct_company_url_has_highest_priority():
    domains = _company_domains(
        "Example Manufacturing GmbH",
        "https://careers.example-manufacturing.at/jobs/42",
    )

    assert domains[0] == "example-manufacturing.at"
    assert domains[1] == "careers.example-manufacturing.at"

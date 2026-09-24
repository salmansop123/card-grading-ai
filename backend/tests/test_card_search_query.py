from app.services.card_identity_service import CardIdentityService


class TestBuildSearchQuery:
    def test_single_word_uses_wildcard(self):
        assert CardIdentityService._build_search_query("Pikachu") == "name:Pikachu*"

    def test_apostrophe_does_not_insert_orphan_s(self):
        query = CardIdentityService._build_search_query("Blaine's Charizard")
        assert "name:s" not in query
        assert "name:Blaine*" in query
        assert "name:Charizard*" in query

    def test_multi_word_all_wildcards(self):
        query = CardIdentityService._build_search_query("Greninja GX")
        assert query == "name:Greninja* name:GX*"

    def test_extract_words_filters_single_char(self):
        words = CardIdentityService._extract_search_words("Blaine's Charizard")
        assert words == ["Blaine", "Charizard"]

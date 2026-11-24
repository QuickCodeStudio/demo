package com.quickcode.module.db;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.core.JsonProcessingException;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class SeedSupportTest {

    @Test
    void contentHashIsUppercaseSha256() {
        String hash = SeedSupport.contentHash("hello");
        assertEquals("2CF24DBA5FB0A30E26E83B2AC5B9E29E1B161E5C1FA7425E73043362938B9824", hash);
    }

    @Test
    void stripBomBeforeHash() {
        String withBom = "\uFEFF{\"Items\":[{\"Id\":1}]}";
        String stripped = SqlLoader.stripBom(withBom);
        assertTrue(stripped.startsWith("{"));
        assertEquals(SeedSupport.contentHash(stripped), SeedSupport.contentHash("{\"Items\":[{\"Id\":1}]}"));
    }

    @Test
    void quoteIdentEscapesPerDialect() {
        assertEquals("[a]]b]", SeedSupport.quoteIdent("a]b", DbConfig.QuickCodeDbType.MSSQL));
        assertEquals("`a``b`", SeedSupport.quoteIdent("a`b", DbConfig.QuickCodeDbType.MYSQL));
        assertEquals("\"a\"\"b\"", SeedSupport.quoteIdent("a\"b", DbConfig.QuickCodeDbType.POSTGRESQL));
    }

    @Test
    void buildRowKeyMatchesJsonStringifySemantics() {
        Map<String, Object> row = Map.of("Id", 1, "Name", "x");
        String key = SeedSupport.buildRowKey(row, List.of("Id", "Name"));
        assertEquals("Id=1|Name=\"x\"", key);
    }

    @Test
    void parseSeedRootGroupsTables() throws JsonProcessingException {
        String json =
                """
                {"Users":[{"Id":1,"Name":"a"}],"Empty":[],"Skip":{}}
                """;
        Map<String, List<Map<String, Object>>> root = SeedSupport.parseSeedRoot(json);
        assertEquals(1, root.size());
        assertTrue(root.containsKey("Users"));
        assertEquals(1, root.get("Users").getFirst().get("Id"));
    }
}

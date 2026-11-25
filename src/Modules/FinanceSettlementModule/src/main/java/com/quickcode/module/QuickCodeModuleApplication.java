package com.quickcode.module;

import com.quickcode.module.db.AdoConnectionStringSupport;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class QuickCodeModuleApplication {

    public static void main(String[] args) {
        if (System.getenv("MODULE_NAME") == null || System.getenv("MODULE_NAME").isBlank()) {
            System.setProperty("MODULE_NAME", "Template0ModuleName");
        }
        // Cloud Run often has only READ_CONNECTION_STRING (C# ADO) — map to DB_* for Spring.
        AdoConnectionStringSupport.applyConnectionStringEnvFallback();
        SpringApplication.run(QuickCodeModuleApplication.class, args);
    }
}

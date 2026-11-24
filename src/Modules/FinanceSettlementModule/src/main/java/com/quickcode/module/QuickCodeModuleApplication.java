package com.quickcode.module;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class QuickCodeModuleApplication {

    public static void main(String[] args) {
        if (System.getenv("MODULE_NAME") == null || System.getenv("MODULE_NAME").isBlank()) {
            System.setProperty("MODULE_NAME", "Template0ModuleName");
        }
        SpringApplication.run(QuickCodeModuleApplication.class, args);
    }
}

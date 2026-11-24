package com.example.vulnapp;

import java.io.File;
import java.io.IOException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

public class VulnerableService {

    private final Connection conn;

    public VulnerableService(Connection conn) {
        this.conn = conn;
    }

    // SQL injection: l'input finisce dentro la query
    public boolean userExists(String name) throws SQLException {
        Statement st = conn.createStatement();
        ResultSet rs = st.executeQuery("SELECT id FROM users WHERE name = '" + name + "'");
        return rs.next();
    }

    // Path traversal: l'input sceglie il file da aprire
    public File openCover(String fileName) {
        return new File("/var/bookshop/covers/" + fileName);
    }

    // Command injection: l'input finisce nel comando di sistema
    public Process exportPdf(String orderId) throws IOException {
        return Runtime.getRuntime().exec("pdfexport " + orderId);
    }

    // Crittografia debole: MD5 per le password
    public byte[] hashPassword(String password) throws NoSuchAlgorithmException {
        return MessageDigest.getInstance("MD5").digest(password.getBytes());
    }
}

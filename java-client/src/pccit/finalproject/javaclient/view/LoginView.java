package pccit.finalproject.javaclient.view;

import javax.swing.*;
import javax.swing.border.LineBorder;
import java.awt.*;
import java.awt.event.ActionListener;

public class LoginView extends JFrame {
    private JTextField usernameField;
    private JPasswordField passwordField;
    private JButton loginButton;
    private JLabel statusLabel;

    public LoginView() {
        initializeComponents();
        layoutComponents();
        setupWindow();
    }

    private void initializeComponents() {
        usernameField = new JTextField(20);
        passwordField = new JPasswordField(20);
        loginButton = createStyledButton("Login", new Color(75, 101, 132));
        statusLabel = new JLabel("Please login");
        
        styleTextField(usernameField);
        styleTextField(passwordField);
        
        statusLabel.setFont(new Font("Arial", Font.BOLD, 14));
        statusLabel.setForeground(new Color(51, 51, 51));
    }

    private void layoutComponents() {
        JPanel mainPanel = new JPanel();
        mainPanel.setLayout(new BoxLayout(mainPanel, BoxLayout.Y_AXIS));
        mainPanel.setBorder(BorderFactory.createEmptyBorder(20, 20, 20, 20));

        // Status label panel
        JPanel statusPanel = new JPanel();
        statusPanel.add(statusLabel);
        
        // Input panel
        JPanel inputPanel = new JPanel(new GridLayout(2, 2, 8, 8));
        inputPanel.add(new JLabel("Username: "));
        inputPanel.add(usernameField);
        inputPanel.add(new JLabel("Password: "));
        inputPanel.add(passwordField);

        // Button panel
        JPanel buttonPanel = new JPanel();
        buttonPanel.add(loginButton);

        mainPanel.add(statusPanel);
        mainPanel.add(Box.createVerticalStrut(15));
        mainPanel.add(inputPanel);
        mainPanel.add(Box.createVerticalStrut(15));
        mainPanel.add(buttonPanel);

        add(mainPanel);
    }

    private void setupWindow() {
        setTitle("Blog Management System - Login");
        setDefaultCloseOperation(JFrame.DISPOSE_ON_CLOSE);
        setResizable(false);
        pack();
        setLocationRelativeTo(null);
    }

    private void styleTextField(JTextField textField) {
        textField.setFont(new Font("Arial", Font.PLAIN, 14));
        textField.setBorder(BorderFactory.createCompoundBorder(
            new LineBorder(new Color(204, 204, 204), 1),
            BorderFactory.createEmptyBorder(5, 8, 5, 8)
        ));
    }

    private JButton createStyledButton(String text, Color bgColor) {
        JButton button = new JButton(text);
        button.setFont(new Font("Arial", Font.BOLD, 12));
        button.setForeground(Color.WHITE);
        button.setBackground(bgColor);
        button.setFocusPainted(false);
        button.setBorderPainted(false);
        button.setOpaque(true);
        button.setCursor(new Cursor(Cursor.HAND_CURSOR));
        
        button.addMouseListener(new java.awt.event.MouseAdapter() {
            public void mouseEntered(java.awt.event.MouseEvent evt) {
                button.setBackground(brightenColor(bgColor));
            }

            public void mouseExited(java.awt.event.MouseEvent evt) {
                button.setBackground(bgColor);
            }
        });
        
        return button;
    }

    private Color brightenColor(Color color) {
        float[] hsb = Color.RGBtoHSB(color.getRed(), color.getGreen(), color.getBlue(), null);
        return Color.getHSBColor(hsb[0], Math.max(0f, hsb[1] - 0.1f), Math.min(1f, hsb[2] + 0.1f));
    }

    // Getters
    public JTextField getUsernameField() {
        return usernameField;
    }

    public JPasswordField getPasswordField() {
        return passwordField;
    }

    public JButton getLoginButton() {
        return loginButton;
    }

    public void setStatusText(String text) {
        statusLabel.setText(text);
    }

    public void addLoginListener(ActionListener listener) {
        loginButton.addActionListener(listener);
    }
} 
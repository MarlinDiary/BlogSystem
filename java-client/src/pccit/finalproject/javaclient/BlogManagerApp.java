package pccit.finalproject.javaclient;

import pccit.finalproject.javaclient.view.LoginView;
import javax.swing.*;

/**
 * Initialize the Blog Manager application.
 * This app uses the Model-View-Controller (MVC) design pattern.
 */
public class BlogManagerApp {
    private static JFrame mainFrame;
    private static BlogManagerView mainView;
    private static BlogManagerModel model;
    private static BlogManagerController controller;

    /**
     * Main method to start the application.
     * @param args command line arguments
     */
    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            // Create the model
            model = new BlogManagerModel();

            // Show login window first
            LoginView loginView = new LoginView();
            loginView.addLoginListener(e -> handleLogin(loginView));
            loginView.setVisible(true);
        });
    }

    private static void handleLogin(LoginView loginView) {
        String username = loginView.getUsernameField().getText();
        String password = new String(loginView.getPasswordField().getPassword());

        if (model.sendLoginRequest(username, password)) {
            // Login successful, close login window
            loginView.dispose();

            // Create and show main interface
            SwingUtilities.invokeLater(() -> {
                mainView = new BlogManagerView();
                createAndShowMainGUI();
                controller = new BlogManagerController(model, mainView);
            });
        } else {
            loginView.setStatusText("Login failed. Please try again.");
        }
    }

    /**
     * Create and show the main GUI.
     */
    private static void createAndShowMainGUI() {
        mainFrame = new JFrame("Blog Management System");
        mainFrame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);  // 主窗口关闭时退出程序
        mainFrame.add(mainView.getMainPanel());
        mainFrame.pack();
        mainFrame.setLocationRelativeTo(null);
        mainFrame.setVisible(true);
    }
}

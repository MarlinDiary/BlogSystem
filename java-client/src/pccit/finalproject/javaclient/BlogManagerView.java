package pccit.finalproject.javaclient;

import javax.swing.*;
import javax.swing.border.EmptyBorder;
import javax.swing.border.LineBorder;
import javax.swing.event.ListSelectionListener;
import javax.swing.table.TableColumnModel;
import javax.swing.table.JTableHeader;
import java.awt.*;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;
import pccit.finalproject.javaclient.model.*;

import static pccit.finalproject.javaclient.config.Config.DEFAULT_AVATAR_URL;

/**
 * The view model for the blog manager.
 */
public class BlogManagerView extends JPanel {
    //Buttons and labels for the top panel
    JButton logoutBtn;
    JLabel statusLabel;

    //Buttons for user management
    JButton displayAllUsersBtn, banUserBtn, revalidateUserBtn, deleteUserBtn;

    //Table model for the user table
    UserTableModel userTableModel;

    //Table for the user list
    JTable userTable;

    //List of users
    List<User> users;

    //Index of the selected row in the user table
    int selectedRow;

    //Listener for the user table
    private ListSelectionListener userTableSelectionListener;

    // Main components
    private JPanel statsPanel;
    private JPanel articlesPanel;
    private JPanel commentsPanel;
    private JPanel userInfoPanel;
    private JPanel rightTablePanel;
    
    // Statistics components
    private JPanel totalUsersCard;
    private JPanel activeUsersCard;
    private JPanel bannedUsersCard;
    private JPanel totalArticlesCard;
    private JPanel totalCommentsCard;
    private JButton refreshStatsButton;
    
    // Article management components
    private JTable articlesTable;
    private JButton refreshArticlesButton;
    private JButton deleteArticleButton;
    private JButton viewArticleButton;
    
    // Comment management components
    private JTable commentsTable;
    private JButton refreshCommentsButton;
    private JButton deleteCommentButton;
    private JButton viewCommentButton;

    // Navigation buttons
    private JButton usersNavBtn, statsNavBtn, articlesNavBtn, commentsNavBtn;
    private CardLayout contentCardLayout;
    private JPanel contentCards;

    /**
     * Constructor to initialize the view.
     */
    public BlogManagerView() {
        // Set modern look and feel
        try {
            UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName());
        } catch (Exception e) {
            e.printStackTrace();
        }

        // Initialize all components
        initializeComponents();
        
        // Build GUI
        layoutGUI();
    }

    private void initializeComponents() {
        // Initialize status label and logout button
        statusLabel = new JLabel("Welcome");
        statusLabel.setFont(new Font("Arial", Font.BOLD, 12));
        statusLabel.setForeground(new Color(51, 51, 51));

        // Initialize navigation buttons
        usersNavBtn = createStyledButton("Users", new Color(75, 101, 132));
        statsNavBtn = createStyledButton("Statistics", new Color(75, 101, 132));
        articlesNavBtn = createStyledButton("Articles", new Color(75, 101, 132));
        commentsNavBtn = createStyledButton("Comments", new Color(75, 101, 132));

        // Initialize other buttons with modern styling
        logoutBtn = createStyledButton("Logout", new Color(149, 165, 166));
        banUserBtn = createStyledButton("Ban user", new Color(149, 165, 166));
        revalidateUserBtn = createStyledButton("Revalidate user", new Color(108, 122, 137));
        deleteUserBtn = createStyledButton("Delete user", new Color(149, 165, 166));

        // Set initial button states
        banUserBtn.setEnabled(false);
        revalidateUserBtn.setEnabled(false);
        deleteUserBtn.setEnabled(false);

        // Initialize user list and table
        users = new ArrayList<>();
        userTableModel = new UserTableModel(users);
        userTable = new JTable(userTableModel);
        
        // Initialize panels
        initializeStatsPanel();
        initializeArticlesPanel();
        initializeCommentsPanel();

        // Initialize card layout
        contentCardLayout = new CardLayout();
        contentCards = new JPanel(contentCardLayout);
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

    /**
     *  The GUI components.
     *  It contains the main tabbed pane and a top panel for logout button.
     */
    public void layoutGUI(){
        setPreferredSize(new Dimension(1200, 800));
        setLayout(new BorderLayout(5, 5));
        setBorder(BorderFactory.createEmptyBorder(10, 10, 10, 10));
        setBackground(new Color(240, 240, 240));

        // Create header panel
        JPanel headerPanel = new JPanel(new BorderLayout());
        headerPanel.setOpaque(true);
        headerPanel.setBackground(new Color(240, 240, 240));
        
        // Left side welcome message
        JPanel welcomePanel = new JPanel(new FlowLayout(FlowLayout.LEFT));
        welcomePanel.setOpaque(true);
        welcomePanel.setBackground(new Color(240, 240, 240));
        statusLabel.setFont(new Font("Arial", Font.BOLD, 14));
        welcomePanel.add(statusLabel);
        
        // Center navigation panel
        JPanel navPanel = new JPanel(new FlowLayout(FlowLayout.CENTER, 20, 0));
        navPanel.setOpaque(true);
        navPanel.setBackground(new Color(240, 240, 240));
        navPanel.add(usersNavBtn);
        navPanel.add(statsNavBtn);
        navPanel.add(articlesNavBtn);
        navPanel.add(commentsNavBtn);
        
        // Right side logout button
        JPanel logoutPanel = new JPanel(new FlowLayout(FlowLayout.RIGHT));
        logoutPanel.setOpaque(true);
        logoutPanel.setBackground(new Color(240, 240, 240));
        logoutBtn.setPreferredSize(new Dimension(100, 30));
        logoutPanel.add(logoutBtn);
        
        // Add components to header panel
        headerPanel.add(welcomePanel, BorderLayout.WEST);
        headerPanel.add(navPanel, BorderLayout.CENTER);
        headerPanel.add(logoutPanel, BorderLayout.EAST);
        
        // Create content cards
        contentCards.add(createUserPanel(), "USERS");
        contentCards.add(statsPanel, "STATS");
        contentCards.add(articlesPanel, "ARTICLES");
        contentCards.add(commentsPanel, "COMMENTS");
        
        // Add navigation button listeners
        usersNavBtn.addActionListener(e -> contentCardLayout.show(contentCards, "USERS"));
        statsNavBtn.addActionListener(e -> contentCardLayout.show(contentCards, "STATS"));
        articlesNavBtn.addActionListener(e -> contentCardLayout.show(contentCards, "ARTICLES"));
        commentsNavBtn.addActionListener(e -> contentCardLayout.show(contentCards, "COMMENTS"));
        
        // Set initial active state
        usersNavBtn.setBackground(brightenColor(usersNavBtn.getBackground()));
        contentCardLayout.show(contentCards, "USERS");
        
        // Add panels to main panel
        add(headerPanel, BorderLayout.NORTH);
        add(contentCards, BorderLayout.CENTER);
    }

    private JPanel createUserPanel() {
        JPanel userPanel = new JPanel(new BorderLayout(10, 10));
        userPanel.setOpaque(true);
        userPanel.setBackground(new Color(240, 240, 240));
        
        // User control buttons panel
        JPanel userControlPanel = new JPanel(new FlowLayout(FlowLayout.LEFT, 10, 5));
        userControlPanel.setOpaque(true);
        userControlPanel.setBackground(new Color(240, 240, 240));
        userControlPanel.add(banUserBtn);
        userControlPanel.add(revalidateUserBtn);
        userControlPanel.add(deleteUserBtn);
        
        userPanel.add(userControlPanel, BorderLayout.NORTH);
        userPanel.add(createViewsPanel(), BorderLayout.CENTER);
        
        return userPanel;
    }

    /**
     * Create the views panel for user management.
     * Contains the user info panel and user table.
     */
    public JPanel createViewsPanel(){
        JPanel viewsPane = new JPanel(new BorderLayout(15, 15));
        viewsPane.setBorder(BorderFactory.createEmptyBorder(10, 10, 10, 10));

        userInfoPanel = new JPanel();
        userInfoPanel.setLayout(new BoxLayout(userInfoPanel, BoxLayout.Y_AXIS));
        userInfoPanel.setBorder(BorderFactory.createCompoundBorder(
            new LineBorder(new Color(224, 224, 224), 1),
            BorderFactory.createEmptyBorder(15, 15, 15, 15)
        ));
        userInfoPanel.setPreferredSize(new Dimension(300, 0));
        userInfoPanel.setBackground(Color.WHITE);

        rightTablePanel = createRightTablePanel();

        viewsPane.add(userInfoPanel, BorderLayout.WEST);
        viewsPane.add(rightTablePanel, BorderLayout.CENTER);

        return viewsPane;
    }

    /**
     * Create the right table panel.
     * The right table panel contains a table to display the user list.
     * @return the right table panel
     */
    public JPanel createRightTablePanel(){
        rightTablePanel = new JPanel();
        rightTablePanel.setLayout(new BorderLayout());

        //call the method to display the user table
        displayUserTable(users);

        return rightTablePanel;
    }

    /**
     * Display the user table.
     * @param users the list of users
     */
    public void displayUserTable(List<User> users) {
        this.users = users;
        userTableModel = new UserTableModel(users);
        userTable.setModel(userTableModel);

        // Improve table appearance
        userTable.setShowGrid(true);
        userTable.setGridColor(new Color(224, 224, 224));
        userTable.setRowHeight(25);
        userTable.setIntercellSpacing(new Dimension(1, 1));
        userTable.setFillsViewportHeight(true);
        userTable.setSelectionBackground(new Color(232, 240, 254));
        userTable.setSelectionForeground(Color.BLACK);

        // Style header
        JTableHeader header = userTable.getTableHeader();
        header.setFont(new Font("Arial", Font.BOLD, 12));
        header.setBackground(new Color(245, 245, 245));
        header.setForeground(new Color(51, 51, 51));

        // Set column widths
        TableColumnModel columnModel = userTable.getColumnModel();
        columnModel.getColumn(0).setPreferredWidth(50);  // ID
        columnModel.getColumn(1).setPreferredWidth(100); // Username
        columnModel.getColumn(2).setPreferredWidth(100); // Real Name
        columnModel.getColumn(3).setPreferredWidth(100); // Date of Birth
        columnModel.getColumn(4).setPreferredWidth(150); // Bio
        columnModel.getColumn(5).setPreferredWidth(150); // Avatar URL
        columnModel.getColumn(6).setPreferredWidth(100); // Created At
        columnModel.getColumn(7).setPreferredWidth(80);  // Status
        columnModel.getColumn(8).setPreferredWidth(80);  // ArticleCount
        columnModel.getColumn(9).setPreferredWidth(80);  // CommentCount
        columnModel.getColumn(10).setPreferredWidth(80); // HasAvatar

        // Custom renderer for status column
        columnModel.getColumn(7).setCellRenderer(new UserTableModel.StatusColumnRenderer());

        // Remove the old listener (if exists)
        if (userTableSelectionListener != null) {
            userTable.getSelectionModel().removeListSelectionListener(userTableSelectionListener);
        }

        // Add a new listener
        userTableSelectionListener = e -> {
            if (!e.getValueIsAdjusting() && userTable.getSelectedRow() != -1) {
                selectedRow = userTable.getSelectedRow();
                if (selectedRow >= 0) {
                    deleteUserBtn.setEnabled(true);
                    
                    // Get the selected user
                    int userId = (int) userTable.getValueAt(selectedRow, 0);
                    User selectedUser = users.stream()
                            .filter(user -> user.getId() == userId)
                            .findFirst()
                            .orElse(null);
                    
                    if (selectedUser != null) {
                        displaySelectedUserInfo(selectedUser);
                        String status = selectedUser.getStatus();
                        banUserBtn.setEnabled(status.equals("active"));
                        revalidateUserBtn.setEnabled(status.equals("banned"));
                    }
                }
            }
        };

        // Add the listener to the table
        userTable.getSelectionModel().addListSelectionListener(userTableSelectionListener);

        rightTablePanel.removeAll();
        rightTablePanel.add(new JScrollPane(userTable), BorderLayout.CENTER);
        rightTablePanel.revalidate();
        rightTablePanel.repaint();

        // Automatically select the first row if there are users
        if (users != null && !users.isEmpty()) {
            userTable.setRowSelectionInterval(0, 0);
        }
    }

    /**
     * Display the selected user information.
     * @param user the selected user
     */
    public void displaySelectedUserInfo(User user){
        userInfoPanel.removeAll();
        userInfoPanel.setBackground(Color.WHITE);

        // Avatar panel with improved styling
        JPanel avatarPanel = new JPanel();
        avatarPanel.setBackground(Color.WHITE);
        JLabel avatarLabel = new JLabel("Loading Avatar...");
        avatarLabel.setHorizontalAlignment(SwingConstants.CENTER);
        
        String avatarUrl = user.getAvatarUrl() == null ? DEFAULT_AVATAR_URL : "http://localhost:3000" + user.getAvatarUrl();

        try {
            ImageIcon avatarIcon = new ImageIcon(new URL(avatarUrl));
            Image scaledImage = getScaledImage(avatarIcon);
            avatarLabel.setIcon(new ImageIcon(scaledImage));
            avatarLabel.setText("");
        } catch (Exception e) {
            avatarLabel.setText("Failed to load avatar");
            avatarLabel.setForeground(Color.RED);
        }

        avatarPanel.add(avatarLabel);
        
        // User info card with improved styling
        JPanel userCard = new JPanel(new GridLayout(0, 2, 10, 5));
        userCard.setBackground(Color.WHITE);
        userCard.setBorder(BorderFactory.createEmptyBorder(10, 10, 10, 10));

        addUserInfoField(userCard, "ID", String.valueOf(user.getId()));
        addUserInfoField(userCard, "Username", user.getUsername());
        if (user.getRealName() != null) {
            addUserInfoField(userCard, "Real Name", user.getRealName());
        }
        if (user.getDateOfBirth() != null) {
            addUserInfoField(userCard, "Birth Date", user.getDateOfBirth().toString());
        }
        if (user.getBio() != null) {
            addUserInfoField(userCard, "Bio", user.getBio());
        }
        addUserInfoField(userCard, "Status", user.getStatus());
        addUserInfoField(userCard, "Articles", String.valueOf(user.getArticleCount()));
        addUserInfoField(userCard, "Comments", String.valueOf(user.getCommentCount()));

        userInfoPanel.add(avatarPanel);
        userInfoPanel.add(Box.createVerticalStrut(10));
        userInfoPanel.add(userCard);

        userInfoPanel.revalidate();
        userInfoPanel.repaint();
    }

    private void addUserInfoField(JPanel panel, String label, String value) {
        JLabel labelComponent = new JLabel(label + ":");
        labelComponent.setFont(new Font("Arial", Font.BOLD, 12));
        
        JLabel valueComponent = new JLabel(value);
        valueComponent.setFont(new Font("Arial", Font.PLAIN, 12));
        
        if (label.equals("Status")) {
            if (value.equals("banned")) {
                valueComponent.setForeground(Color.RED);
                valueComponent.setFont(valueComponent.getFont().deriveFont(Font.BOLD));
            } else {
                valueComponent.setForeground(new Color(39, 174, 96));
            }
        }
        
        panel.add(labelComponent);
        panel.add(valueComponent);
    }

    /**
     * Get the scaled image.
     * @param avatarIcon the avatar icon
     * @return the scaled image
     */
    private static Image getScaledImage(ImageIcon avatarIcon) {
        Image image = avatarIcon.getImage();

        //set the largest width and height
        int targetWidth = 270;
        int targetHeight = 270;
        int width = avatarIcon.getIconWidth();
        int height= avatarIcon.getIconHeight();

        //if the image is larger than the target width or height, scale the image
        if (width > targetWidth || height > targetHeight) {

            //calculate the aspect ratio and fix it
            float aspect= (float) width / height;
            if (width > height) {
                targetHeight = (int) (targetWidth / aspect);
            } else {
                targetWidth = (int) (targetHeight * aspect);
            }
        }

        //return the scaled image
        return image.getScaledInstance(targetWidth, targetHeight, Image.SCALE_SMOOTH);
    }

    /**
     * Get the main panel.
     * @return the main panel
     */
    public JPanel getMainPanel() {
        return this;
    }

    private void initializeStatsPanel() {
        statsPanel = new JPanel();
        statsPanel.setLayout(new BorderLayout(10, 10));
        statsPanel.setBorder(BorderFactory.createEmptyBorder(20, 20, 20, 20));
        statsPanel.setBackground(new Color(240, 240, 240));

        // 创建主面板，使用 GridLayout 布局
        JPanel mainPanel = new JPanel(new GridLayout(2, 3, 20, 20));
        mainPanel.setBackground(new Color(240, 240, 240));

        // 创建统计卡片
        totalUsersCard = createStatsCard("Total Users", "0", new Color(41, 128, 185));
        activeUsersCard = createStatsCard("Active Users", "0", new Color(39, 174, 96));
        bannedUsersCard = createStatsCard("Banned Users", "0", new Color(192, 57, 43));
        totalArticlesCard = createStatsCard("Total Articles", "0", new Color(142, 68, 173));
        totalCommentsCard = createStatsCard("Total Comments", "0", new Color(230, 126, 34));

        // 添加卡片到主面板
        mainPanel.add(totalUsersCard);
        mainPanel.add(activeUsersCard);
        mainPanel.add(bannedUsersCard);
        mainPanel.add(totalArticlesCard);
        mainPanel.add(totalCommentsCard);

        // 添加到主面板
        statsPanel.add(mainPanel, BorderLayout.CENTER);
    }

    private JPanel createStatsCard(String title, String value, Color color) {
        JPanel card = new JPanel();
        card.setLayout(new BoxLayout(card, BoxLayout.Y_AXIS));
        card.setBackground(Color.WHITE);
        card.setBorder(BorderFactory.createCompoundBorder(
            new LineBorder(new Color(224, 224, 224), 1),
            BorderFactory.createEmptyBorder(20, 20, 20, 20)
        ));

        // 创建标题标签
        JLabel titleLabel = new JLabel(title);
        titleLabel.setFont(new Font("Arial", Font.BOLD, 16));
        titleLabel.setForeground(new Color(102, 102, 102));
        titleLabel.setAlignmentX(Component.CENTER_ALIGNMENT);

        // 创建数值标签
        JLabel valueLabel = new JLabel(value);
        valueLabel.setFont(new Font("Arial", Font.BOLD, 36));
        valueLabel.setForeground(color);
        valueLabel.setAlignmentX(Component.CENTER_ALIGNMENT);

        // 添加图标（使用圆形色块代替）
        JPanel iconPanel = new JPanel() {
            @Override
            protected void paintComponent(Graphics g) {
                super.paintComponent(g);
                Graphics2D g2d = (Graphics2D) g;
                g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
                g2d.setColor(color);
                g2d.fillOval(0, 0, 40, 40);
            }
        };
        iconPanel.setPreferredSize(new Dimension(40, 40));
        iconPanel.setMaximumSize(new Dimension(40, 40));
        iconPanel.setOpaque(false);
        iconPanel.setAlignmentX(Component.CENTER_ALIGNMENT);

        // 添加组件到卡片
        card.add(iconPanel);
        card.add(Box.createVerticalStrut(15));
        card.add(titleLabel);
        card.add(Box.createVerticalStrut(10));
        card.add(valueLabel);

        // 添加鼠标悬停效果
        card.addMouseListener(new java.awt.event.MouseAdapter() {
            public void mouseEntered(java.awt.event.MouseEvent evt) {
                card.setBackground(new Color(249, 249, 249));
            }

            public void mouseExited(java.awt.event.MouseEvent evt) {
                card.setBackground(Color.WHITE);
            }
        });

        return card;
    }

    // Methods to update statistics
    public void updateStats(SiteStats stats) {
        updateStatsCard(totalUsersCard, String.valueOf(stats.getTotalUsers()));
        updateStatsCard(totalArticlesCard, String.valueOf(stats.getTotalArticles()));
        updateStatsCard(totalCommentsCard, String.valueOf(stats.getTotalComments()));
        updateStatsCard(activeUsersCard, String.valueOf(stats.getActiveUsers()));
        updateStatsCard(bannedUsersCard, String.valueOf(stats.getBannedUsers()));
    }

    private void updateStatsCard(JPanel card, String value) {
        Component[] components = card.getComponents();
        for (Component component : components) {
            if (component instanceof JLabel) {
                JLabel label = (JLabel) component;
                if (label.getFont().getSize() == 36) {
                    label.setText(value);
                    break;
                }
            }
        }
    }

    // Add method to update welcome message with username
    public void setWelcomeMessage(String username) {
        statusLabel.setText("Welcome, " + username);
    }

    private void initializeArticlesPanel() {
        articlesPanel = new JPanel(new BorderLayout(10, 10));
        articlesPanel.setBorder(BorderFactory.createEmptyBorder(15, 15, 15, 15));

        // 创建按钮面板
        JPanel buttonPanel = new JPanel(new FlowLayout(FlowLayout.LEFT));
        deleteArticleButton = createStyledButton("Delete", new Color(149, 165, 166));
        viewArticleButton = createStyledButton("View", new Color(75, 101, 132));
        
        buttonPanel.add(deleteArticleButton);
        buttonPanel.add(viewArticleButton);

        // 创建文章表格
        articlesTable = new JTable();
        styleTable(articlesTable);
        
        // 添加到面板
        articlesPanel.add(buttonPanel, BorderLayout.NORTH);
        articlesPanel.add(new JScrollPane(articlesTable), BorderLayout.CENTER);
    }

    private void initializeCommentsPanel() {
        commentsPanel = new JPanel(new BorderLayout(10, 10));
        commentsPanel.setBorder(BorderFactory.createEmptyBorder(15, 15, 15, 15));

        // 创建按钮面板
        JPanel buttonPanel = new JPanel(new FlowLayout(FlowLayout.LEFT));
        deleteCommentButton = createStyledButton("Delete", new Color(149, 165, 166));
        viewCommentButton = createStyledButton("View", new Color(75, 101, 132));
        
        buttonPanel.add(deleteCommentButton);
        buttonPanel.add(viewCommentButton);

        // 创建评论表格
        commentsTable = new JTable();
        styleTable(commentsTable);
        
        // 添加到面板
        commentsPanel.add(buttonPanel, BorderLayout.NORTH);
        commentsPanel.add(new JScrollPane(commentsTable), BorderLayout.CENTER);
    }

    private void styleTable(JTable table) {
        table.setShowGrid(true);
        table.setGridColor(new Color(224, 224, 224));
        table.setRowHeight(25);
        table.setIntercellSpacing(new Dimension(1, 1));
        table.setFillsViewportHeight(true);
        table.setSelectionBackground(new Color(232, 240, 254));
        table.setSelectionForeground(Color.BLACK);
        
        // 设置表头样式
        JTableHeader header = table.getTableHeader();
        header.setFont(new Font("Arial", Font.BOLD, 12));
        header.setBackground(new Color(245, 245, 245));
        header.setForeground(new Color(51, 51, 51));
    }

    // Getters for new components
    public JButton getRefreshStatsButton() { return refreshStatsButton; }
    public JButton getRefreshArticlesButton() { return refreshArticlesButton; }
    public JButton getDeleteArticleButton() { return deleteArticleButton; }
    public JButton getViewArticleButton() { return viewArticleButton; }
    public JButton getRefreshCommentsButton() { return refreshCommentsButton; }
    public JButton getDeleteCommentButton() { return deleteCommentButton; }
    public JButton getViewCommentButton() { return viewCommentButton; }
    public JTable getArticlesTable() { return articlesTable; }
    public JTable getCommentsTable() { return commentsTable; }
}







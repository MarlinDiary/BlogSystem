package pccit.finalproject.javaclient;

import javax.swing.*;
import java.awt.*;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.util.ArrayList;
import java.util.List;
import pccit.finalproject.javaclient.model.*;
import pccit.finalproject.javaclient.view.LoginView;

/**
 * The controller for managing interactions between the BlogManagerView and BlogManagerModel.
 */
public class BlogManagerController {

    private final BlogManagerModel model;
    private final BlogManagerView view;
    private ArticleTableModel articleTableModel;
    private CommentTableModel commentTableModel;

    /**
     * Creates a new BlogManagerController.
     * @param model the model
     * @param view  the view
     */
    public BlogManagerController(BlogManagerModel model, BlogManagerView view) {
        this.model = model;
        this.view = view;

        // Set welcome message with username
        view.setWelcomeMessage(model.getCurrentUsername());

        // Initialize table models
        articleTableModel = new ArticleTableModel(new ArrayList<>());
        commentTableModel = new CommentTableModel(new ArrayList<>());
        view.getArticlesTable().setModel(articleTableModel);
        view.getCommentsTable().setModel(commentTableModel);

        // Load all data automatically
        loadAllData();

        // Add existing listeners
        addExistingListeners();
        
        // Add new listeners
        addNewListeners();
    }

    private void loadAllData() {
        // Load users
        SwingWorker<List<User>, Void> userWorker = new SwingWorker<List<User>, Void>() {
            @Override
            protected List<User> doInBackground() {
                return model.sendGetUsersRequest();
            }

            @Override
            protected void done() {
                try {
                    view.users = get();
                    view.displayUserTable(view.users);
                } catch (Exception e) {
                    System.out.println("Unexpected error: " + e.getMessage());
                }
            }
        };
        userWorker.execute();

        // Load statistics
        SwingWorker<SiteStats, Void> statsWorker = new SwingWorker<>() {
            @Override
            protected SiteStats doInBackground() {
                return model.getSiteStats();
            }

            @Override
            protected void done() {
                try {
                    SiteStats stats = get();
                    if (stats != null) {
                        view.updateStats(stats);
                    }
                } catch (Exception ex) {
                    ex.printStackTrace();
                }
            }
        };
        statsWorker.execute();

        // Load articles
        SwingWorker<List<Article>, Void> articleWorker = new SwingWorker<>() {
            @Override
            protected List<Article> doInBackground() {
                return model.getAllArticles();
            }

            @Override
            protected void done() {
                try {
                    List<Article> articles = get();
                    articleTableModel = new ArticleTableModel(articles);
                    view.getArticlesTable().setModel(articleTableModel);
                    view.getDeleteArticleButton().setEnabled(false);
                    view.getViewArticleButton().setEnabled(false);
                } catch (Exception ex) {
                    ex.printStackTrace();
                }
            }
        };
        articleWorker.execute();

        // Load comments
        SwingWorker<List<Comment>, Void> commentWorker = new SwingWorker<>() {
            @Override
            protected List<Comment> doInBackground() {
                return model.getAllComments();
            }

            @Override
            protected void done() {
                try {
                    List<Comment> comments = get();
                    commentTableModel = new CommentTableModel(comments);
                    view.getCommentsTable().setModel(commentTableModel);
                    view.getDeleteCommentButton().setEnabled(false);
                    view.getViewCommentButton().setEnabled(false);
                } catch (Exception ex) {
                    ex.printStackTrace();
                }
            }
        };
        commentWorker.execute();
    }

    private void addExistingListeners() {
        //add an action listener to the logout button
        view.logoutBtn.addActionListener(new ActionListener() {
            @Override
            public void actionPerformed(ActionEvent e) {

                SwingWorker<Boolean, Void> worker = new SwingWorker<Boolean, Void>() {
                    @Override
                    protected Boolean doInBackground(){
                        return model.sendLogoutRequest();
                    }

                    @Override
                    protected void done() {
                        try {
                            //if the logout is successful
                            if (get()) {
                                //clear the token
                                model.token = null;

                                //关闭主窗口
                                Window window = SwingUtilities.getWindowAncestor(view);
                                if (window != null) {
                                    window.dispose();
                                }

                                //显示新的登录窗口
                                LoginView loginView = new LoginView();
                                loginView.addLoginListener(e -> {
                                    String username = loginView.getUsernameField().getText();
                                    String password = new String(loginView.getPasswordField().getPassword());
                                    
                                    if (model.sendLoginRequest(username, password)) {
                                        loginView.dispose();
                                        SwingUtilities.invokeLater(() -> {
                                            BlogManagerView newView = new BlogManagerView();
                                            JFrame newFrame = new JFrame("博客管理系统");
                                            newFrame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
                                            newFrame.add(newView.getMainPanel());
                                            newFrame.pack();
                                            newFrame.setLocationRelativeTo(null);
                                            newFrame.setVisible(true);
                                            new BlogManagerController(model, newView);
                                        });
                                    } else {
                                        loginView.setStatusText("登录失败，请重试");
                                    }
                                });
                                loginView.setVisible(true);

                            } else {
                                view.statusLabel.setText("登出失败");
                            }
                        } catch (Exception ex) {
                            System.out.println("Unexpected error: " + ex.getMessage());
                        }
                    }
                };
                worker.execute();
            }
        });

        //add a mouse listener to the user table
        view.userTable.addMouseListener(new MouseAdapter() {
            @Override
            public void mouseClicked(MouseEvent e) {
                super.mouseClicked(e);

                //get the selected row
                int selectedRow =view.userTable.getSelectedRow();
                if (selectedRow >= 0) {

                    // get the user id
                    int userId =(int)view.userTable.getValueAt(selectedRow, 0);

                    //use stream API to find the user with the same id
                    User selectedUser = view.users.stream()
                            .filter(user -> user.getId() == userId)
                            .findFirst()
                            .orElse(null);

                    if (selectedUser != null){

                        //call the displaySelectedUserInfo method to display the user info
                        view.displaySelectedUserInfo(selectedUser);

                        // 保存选中的行
                        view.selectedRow = selectedRow;

                        // 只有管理员才能使用这些功能
                        if ("admin".equals(model.userRole)) {
                            String status = selectedUser.getStatus();
                            System.out.println("Status: " + status);
                            if (status.equals("active")){
                                view.banUserBtn.setEnabled(true);
                                view.revalidateUserBtn.setEnabled(false);
                                view.deleteUserBtn.setEnabled(true);
                            }else if(status.equals("banned")){
                                view.banUserBtn.setEnabled(false);
                                view.revalidateUserBtn.setEnabled(true);
                                view.deleteUserBtn.setEnabled(true);
                            }
                        } else {
                            view.banUserBtn.setEnabled(false);
                            view.revalidateUserBtn.setEnabled(false);
                            view.deleteUserBtn.setEnabled(false);
                        }
                    }
                }

        }
        });

        //add an action listener to the delete user button
        view.deleteUserBtn.addActionListener(new ActionListener() {
            @Override
            public void actionPerformed(ActionEvent e) {
                    //get the selected user id
                    int selectedId = (int) view.userTableModel.getValueAt(view.selectedRow, 0);

                    SwingWorker<Boolean, Void> worker = new SwingWorker<Boolean, Void>() {
                        @Override
                        protected Boolean doInBackground(){
                            return model.sendDeleteUserRequest(selectedId);
                        }

                        @Override
                        protected void done() {
                            try {
                                if (get()) {
                                    refreshUsers();
                                } else {
                                    JOptionPane.showMessageDialog(null, "Forbidden: Admin privileges required.", "Forbidden", JOptionPane.ERROR_MESSAGE);
                                }
                            } catch (Exception e) {
                                System.out.println("Unexpected error: " + e.getMessage());
                            }
                        }
                    };
                    worker.execute();
            }
        });

        view.banUserBtn.addActionListener(new ActionListener() {
            @Override
            public void actionPerformed(ActionEvent e) {
                //get the selected user id
                int selectedId = (int) view.userTableModel.getValueAt(view.selectedRow, 0);

                SwingWorker<Boolean, Void> worker = new SwingWorker<Boolean, Void>() {
                    @Override
                    protected Boolean doInBackground(){
                        return model.sendBanUserRequest(selectedId);
                    }

                    @Override
                    protected void done() {
                        try {
                            if (get()) {
                                refreshUsers();
                            } else {
                                JOptionPane.showMessageDialog(null, "Failure: The user has already been banned", "Failure", JOptionPane.ERROR_MESSAGE);
                            }
                        } catch (Exception e) {
                            System.out.println("Unexpected error: " + e.getMessage());
                        }
                    }
                };
                worker.execute();
            }
        });

        //add an action listener to the revalidate user button
        view.revalidateUserBtn.addActionListener(new ActionListener() {
            @Override
            public void actionPerformed(ActionEvent e) {
                int selectedId = (int) view.userTableModel.getValueAt(view.selectedRow, 0);

                SwingWorker<Boolean, Void> worker = new SwingWorker<Boolean, Void>() {
                    @Override
                    protected Boolean doInBackground(){
                        return model.sendRevalidateUserRequest(selectedId);
                    }

                    @Override
                    protected void done() {
                        try {
                            if (get()) {
                                refreshUsers();
                            } else {
                                JOptionPane.showMessageDialog(null, "Failure: The user has already been revalidated", "Failure", JOptionPane.ERROR_MESSAGE);
                            }
                        } catch (Exception e) {
                            System.out.println("Unexpected error: " + e.getMessage());
                        }
                    }
                };
                worker.execute();
            }
        });
    }

    private void addNewListeners() {
        // 文章管理相关监听器
        view.getDeleteArticleButton().addActionListener(e -> {
            int selectedRow = view.getArticlesTable().getSelectedRow();
            if (selectedRow >= 0) {
                int articleId = (int) articleTableModel.getValueAt(selectedRow, 0);
                if (JOptionPane.showConfirmDialog(null, 
                    "Are you sure you want to delete this article?", 
                    "Confirm Delete", 
                    JOptionPane.YES_NO_OPTION) == JOptionPane.YES_OPTION) {
                    
                    if (model.deleteArticle(articleId)) {
                        loadAllData(); // 刷新所有数据
                    }
                }
            }
        });

        view.getViewArticleButton().addActionListener(e -> {
            int selectedRow = view.getArticlesTable().getSelectedRow();
            if (selectedRow >= 0) {
                Article article = articleTableModel.getArticleAt(selectedRow);
                showArticleDialog(article);
            }
        });

        // 评论管理相关监听器
        view.getDeleteCommentButton().addActionListener(e -> {
            int selectedRow = view.getCommentsTable().getSelectedRow();
            if (selectedRow >= 0) {
                int commentId = (int) commentTableModel.getValueAt(selectedRow, 0);
                if (JOptionPane.showConfirmDialog(null, 
                    "Are you sure you want to delete this comment?", 
                    "Confirm Delete", 
                    JOptionPane.YES_NO_OPTION) == JOptionPane.YES_OPTION) {
                    
                    if (model.deleteComment(commentId)) {
                        loadAllData(); // 刷新所有数据
                    }
                }
            }
        });

        view.getViewCommentButton().addActionListener(e -> {
            int selectedRow = view.getCommentsTable().getSelectedRow();
            if (selectedRow >= 0) {
                Comment comment = commentTableModel.getCommentAt(selectedRow);
                showCommentDialog(comment);
            }
        });

        // 表格选择监听器
        view.getArticlesTable().getSelectionModel().addListSelectionListener(e -> {
            boolean hasSelection = view.getArticlesTable().getSelectedRow() >= 0;
            view.getDeleteArticleButton().setEnabled(hasSelection);
            view.getViewArticleButton().setEnabled(hasSelection);
        });

        view.getCommentsTable().getSelectionModel().addListSelectionListener(e -> {
            boolean hasSelection = view.getCommentsTable().getSelectedRow() >= 0;
            view.getDeleteCommentButton().setEnabled(hasSelection);
            view.getViewCommentButton().setEnabled(hasSelection);
        });
    }

    private void showArticleDialog(Article article) {
        JDialog dialog = new JDialog();
        dialog.setTitle("Article Details");
        dialog.setModal(true);
        dialog.setSize(600, 400);
        dialog.setLocationRelativeTo(null);

        JPanel panel = new JPanel();
        panel.setLayout(new BoxLayout(panel, BoxLayout.Y_AXIS));
        panel.setBorder(BorderFactory.createEmptyBorder(10, 10, 10, 10));

        // 添加文章信息
        panel.add(new JLabel("Title: " + article.getTitle()));
        panel.add(Box.createVerticalStrut(10));
        panel.add(new JLabel("Author: " + article.getAuthorUsername()));
        panel.add(Box.createVerticalStrut(10));
        
        JTextArea contentArea = new JTextArea(article.getContent());
        contentArea.setEditable(false);
        contentArea.setLineWrap(true);
        contentArea.setWrapStyleWord(true);
        JScrollPane scrollPane = new JScrollPane(contentArea);
        panel.add(scrollPane);

        dialog.add(panel);
        dialog.setVisible(true);
    }

    private void showCommentDialog(Comment comment) {
        JDialog dialog = new JDialog();
        dialog.setTitle("Comment Details");
        dialog.setModal(true);
        dialog.setSize(400, 300);
        dialog.setLocationRelativeTo(null);

        JPanel panel = new JPanel();
        panel.setLayout(new BoxLayout(panel, BoxLayout.Y_AXIS));
        panel.setBorder(BorderFactory.createEmptyBorder(10, 10, 10, 10));

        // 添加评论信息
        panel.add(new JLabel("Article: " + comment.getArticleTitle()));
        panel.add(Box.createVerticalStrut(10));
        panel.add(new JLabel("Author: " + comment.getAuthorUsername()));
        panel.add(Box.createVerticalStrut(10));
        
        JTextArea contentArea = new JTextArea(comment.getContent());
        contentArea.setEditable(false);
        contentArea.setLineWrap(true);
        contentArea.setWrapStyleWord(true);
        JScrollPane scrollPane = new JScrollPane(contentArea);
        panel.add(scrollPane);

        dialog.add(panel);
        dialog.setVisible(true);
    }

    private void refreshUsers() {
        SwingWorker<List<User>, Void> worker = new SwingWorker<List<User>, Void>() {
            @Override
            protected List<User> doInBackground() {
                return model.sendGetUsersRequest();
            }

            @Override
            protected void done() {
                try {
                    view.users = get();
                    view.displayUserTable(view.users);
                    loadAllData(); // 刷新所有数据
                } catch (Exception e) {
                    System.out.println("Unexpected error: " + e.getMessage());
                }
            }
        };
        worker.execute();
    }
}

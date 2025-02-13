package pccit.finalproject.javaclient.model;

public class SiteStats {
    private int totalUsers;
    private int totalArticles;
    private int totalComments;
    private int activeUsers;
    private int bannedUsers;

    // Getters and Setters
    public int getTotalUsers() { return totalUsers; }
    public void setTotalUsers(int totalUsers) { this.totalUsers = totalUsers; }
    
    public int getTotalArticles() { return totalArticles; }
    public void setTotalArticles(int totalArticles) { this.totalArticles = totalArticles; }
    
    public int getTotalComments() { return totalComments; }
    public void setTotalComments(int totalComments) { this.totalComments = totalComments; }
    
    public int getActiveUsers() { return activeUsers; }
    public void setActiveUsers(int activeUsers) { this.activeUsers = activeUsers; }
    
    public int getBannedUsers() { return bannedUsers; }
    public void setBannedUsers(int bannedUsers) { this.bannedUsers = bannedUsers; }
} 
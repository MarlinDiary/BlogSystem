package pccit.finalproject.javaclient;

import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * The User class represents a user in the system.
 * This class has been rewritten to use Jackson instead of Gson.
 */
public class User {

    //id
    private int id;

    //username
    private String username;

    //realName
    private String realName;

    // LocalDate using formant like"2025-01-01"
    @JsonFormat
    private LocalDate dateOfBirth;

    private String bio;
    private String avatarUrl;

    //LocalDateTime using format like "2025/1/1 13:38:34"
    @JsonFormat(pattern = "yyyy/M/d HH:mm:ss")
    private LocalDateTime createdAt;

    //status
    private String status;

    //articleCount
    private int articleCount;

    //commentCount
    private int commentCount;

    //hasAvatar
    private boolean hasAvatar;

    /**
     * the default Constructor used by Jackson to deserialize JSON
     */
    public User() {
    }

    /**
     * the Constructor with parameters
     * @param id the id of the user
     * @param username the username of the user
     * @param realName the real name of the user
     * @param dateOfBirth   the date of birth of the user
     * @param bio  the bio of the user
     * @param avatarUrl the avatar url of the user
     * @param createdAt the created time of the user
     * @param status the status of the user
     * @param articleCount the article count of the user
     * @param commentCount the comment count of the user
     * @param hasAvatar the hasAvatar of the user
     */
    public User(int id, String username, String realName, LocalDate dateOfBirth, String bio, String avatarUrl,
                LocalDateTime createdAt, String status,int articleCount, int commentCount,boolean hasAvatar) {
        this.id = id;
        this.username = username;
        this.realName = realName;
        this.dateOfBirth = dateOfBirth;
        this.bio = bio;
        this.avatarUrl = avatarUrl;
        this.createdAt = createdAt;
        this.status = status;
        this.articleCount = articleCount;
        this.commentCount = commentCount;
        this.hasAvatar = hasAvatar;
    }


    //getter methods
    public int getId() {
        return id;
    }

    public String getUsername() {
        return username;
    }

    public String getRealName() {
        return realName;
    }

    public LocalDate getDateOfBirth() {
        return dateOfBirth;
    }

    public String getBio() {
        return bio;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public boolean getHasAvatar() {
        return hasAvatar;
    }

    public int getArticleCount() {
        return articleCount;
    }

    public int getCommentCount() {
        return commentCount;
    }

    public String getStatus() {
        return status;
    }

}

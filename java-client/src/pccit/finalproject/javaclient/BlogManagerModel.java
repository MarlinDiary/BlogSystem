package pccit.finalproject.javaclient;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import pccit.finalproject.javaclient.config.JacksonConfig;
import pccit.finalproject.javaclient.model.*;

import javax.swing.*;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static pccit.finalproject.javaclient.config.Config.BACKEND_URL;

/**
 * The model for the blog manager.
 * This class sends requests to the backend and processes the responses.
 * It manages HTTP requests such as login, logout, get users, delete user, ban user, and revalidate user.
 */
public class BlogManagerModel {
    String token;
    String userRole;  // 添加用户角色字段
    private String currentUsername;  // Add this field

    /**
     * Send a login request to the backend.
     * @param username The username.
     * @param password The password.
     * @return True if the login request is successful, false otherwise.
     */
    public Boolean sendLoginRequest(String username, String password) {
        try {
            URL url = new URL(BACKEND_URL+"/auth/login");
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("POST");
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setDoOutput(true);

            String requestBody = "{\"username\":\"" + username + "\",\"password\":\"" + password + "\"}";

            try (OutputStream os = connection.getOutputStream()) {
                os.write(requestBody.getBytes());
                os.flush();
            }

            if (connection.getResponseCode() == 200) {
                try (BufferedReader br = new BufferedReader(new InputStreamReader(connection.getInputStream()))) {
                    StringBuilder response = new StringBuilder();
                    String line;
                    while ((line = br.readLine()) != null) {
                        response.append(line);
                    }

                    String responseBody = response.toString();
                    System.out.println("Login response: " + responseBody);

                    // 使用Jackson解析JSON
                    ObjectMapper objectMapper = JacksonConfig.getConfiguredObjectMapper();
                    JsonNode rootNode = objectMapper.readTree(responseBody);
                    
                    // 获取token
                    if (rootNode.has("token")) {
                        this.token = rootNode.get("token").asText();
                        
                        // 获取user信息
                        if (rootNode.has("user")) {
                            JsonNode userNode = rootNode.get("user");
                            if (userNode.has("username") && userNode.has("role")) {
                                this.currentUsername = userNode.get("username").asText();
                                this.userRole = userNode.get("role").asText();
                                System.out.println("Token: " + this.token);
                                System.out.println("User role: " + this.userRole);
                                System.out.println("Username: " + this.currentUsername);
                                return true;
                            }
                        }
                    }
                }
            } else if (connection.getResponseCode() == 401) {
                JOptionPane.showMessageDialog(null, "Wrong username or password", "Login failed", JOptionPane.ERROR_MESSAGE);
            }

        } catch (IOException e) {
            ErrorHandler.handleIOException(e);
        }

        return false;
    }

    /**
     * Send the logout request to the backend.
     * @return True if the logout request is successful, false otherwise.
     */
    public Boolean sendLogoutRequest() {
        try {
            //create the URL
            URL url = new URL(BACKEND_URL+"/auth/logout");
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();

            //Set the request method as POST
            connection.setRequestMethod("POST");
            connection.setRequestProperty("Authorization","Bearer "+this.token);

            //Send the request
            connection.connect();

            //Check the response code
            if (connection.getResponseCode() == 200) {
                return true;
            } else {
                JOptionPane.showMessageDialog(null, "Fail to logout.", "Fail to logout.", JOptionPane.ERROR_MESSAGE);
            }

        } catch (IOException e) {
            //using the ErrorHandler class to handle the exception
            ErrorHandler.handleIOException(e);
        }

        return false;
    }

    /**
     * Send a get users request to the backend.
     * @return A list of users.
     */
    public List<User> sendGetUsersRequest() {

        List<User> users = new ArrayList<>();

        try {
            //Create the URL
            URL url = new URL(BACKEND_URL+"/admin/users");
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();

            //set the request method as GET
            connection.setRequestMethod("GET");
            connection.setRequestProperty("Authorization", "Bearer " +this.token);

            //Send the request
            connection.connect();

            //check the response code
            if (connection.getResponseCode() == 200) {

                //Read the response
                try (BufferedReader br = new BufferedReader(new InputStreamReader(connection.getInputStream()))) {
                    StringBuilder response = new StringBuilder();
                    String line;
                    while ((line = br.readLine()) != null) {
                        response.append(line);
                    }

                    //call the JacksonConfig class to get the configured ObjectMapper and pass it to the readValue method
                    ObjectMapper objectMapper = JacksonConfig.getConfiguredObjectMapper();
                    //Convert the response to a list of users
                    users = objectMapper.readValue(response.toString(), new TypeReference<List<User>>() {});

                } catch (IOException e) {
                    //using the ErrorHandler class to handle the exception
                    ErrorHandler.handleIOException(e);
                }
            }else if (connection.getResponseCode() == 401) {
                JOptionPane.showMessageDialog(null, "Unauthorized: Fail to fetch the user.", "Unauthorized", JOptionPane.ERROR_MESSAGE);
            }else if (connection.getResponseCode() == 403) {
                JOptionPane.showMessageDialog(null, "Forbidden: Admin privileges required.", "Forbidden", JOptionPane.ERROR_MESSAGE);
            }
        }catch (IOException e) {
            //using the ErrorHandler class to handle the exception
            ErrorHandler.handleIOException(e);
        }
        return users;
    }

    /**
     * Send a delete user request to the backend.
     * @param id The id of the user to be deleted.
     * @return True if the delete user request is successful, false otherwise.
     */
    public Boolean sendDeleteUserRequest(int id){
        try {
            //create the URL
            URL url = new URL(BACKEND_URL+"/admin/users/"+id);
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();

            // 打印请求URL
            System.out.println("Delete request URL: " + url.toString());

            //set the request method as DELETE
            connection.setRequestMethod("DELETE");
            connection.setRequestProperty("Authorization", "Bearer " + this.token);
            connection.setRequestProperty("Content-Type", "application/json");
            
            // 打印请求头
            System.out.println("Request headers:");
            System.out.println("Authorization: Bearer " + this.token);
            System.out.println("Content-Type: application/json");
            System.out.println("User role: " + this.userRole);

            //connect to the server
            connection.connect();

            // 读取响应内容
            StringBuilder response = new StringBuilder();
            try (BufferedReader br = new BufferedReader(new InputStreamReader(
                    connection.getResponseCode() >= 400 ? connection.getErrorStream() : connection.getInputStream()))) {
                String line;
                while ((line = br.readLine()) != null) {
                    response.append(line);
                }
            }
            System.out.println("Response code: " + connection.getResponseCode());
            System.out.println("Response body: " + response.toString());

            //check the response code
            if (connection.getResponseCode() == 200) {
                JOptionPane.showMessageDialog(null, "Successfully deleted user (id: "+id+" ).","Success", JOptionPane.INFORMATION_MESSAGE);
                return true;
            } else if (connection.getResponseCode() == 400) {
                String errorMessage = response.toString().contains("Cannot delete the last admin") ? 
                    "Cannot delete the last admin user." : "Invalid request.";
                JOptionPane.showMessageDialog(null, errorMessage, "Error", JOptionPane.ERROR_MESSAGE);
            } else if (connection.getResponseCode() == 401) {
                JOptionPane.showMessageDialog(null, "Unauthorized: Failed to delete user (id: "+id+" ).", "Unauthorized", JOptionPane.ERROR_MESSAGE);
            } else if (connection.getResponseCode() == 403) {
                JOptionPane.showMessageDialog(null, "Forbidden: Admin privileges required.", "Forbidden", JOptionPane.ERROR_MESSAGE);
            } else if (connection.getResponseCode() == 404) {
                JOptionPane.showMessageDialog(null, "User (id: "+id+" ) not found.", "Not Found", JOptionPane.ERROR_MESSAGE);
            } else if (connection.getResponseCode() == 500) {
                String errorMessage = response.toString();
                JOptionPane.showMessageDialog(null, "Server error: " + errorMessage, "Error", JOptionPane.ERROR_MESSAGE);
            }
        } catch (IOException e) {
            //using the ErrorHandler class to handle the exception
            ErrorHandler.handleIOException(e);
            e.printStackTrace();  // 打印详细的错误堆栈
        }
        return false;
    }

    /**
     * Send a ban user request to the backend.
     * @param id The id of the user to be banned.
     * @return True if the ban user request is successful, false otherwise.
     */
    public Boolean sendBanUserRequest(int id){
        try {
            //create the URL
            URL url = new URL(BACKEND_URL+"/admin/users/"+id+"/ban");
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();

            //set the request method as POST
            connection.setRequestMethod("POST");
            connection.setRequestProperty("Authorization", "Bearer " + this.token);
            connection.setRequestProperty("Content-Type", "application/json");

            //allow output to the connection
            connection.setDoOutput(true);

            //construct the JSON body
            // The default reason is "Delete by admin"
            String defaultReason = "Delete by admin";
            // The default duration is 100 hours
            int defaultDurationInHours = 100;
            String requestBody = String.format("{\"reason\":\"%s\",\"durationInHours\":%d}", defaultReason, defaultDurationInHours);

            //Send the request
            try (OutputStream os = connection.getOutputStream()) {
                os.write(requestBody.getBytes());
                os.flush();
            }

            //Check the response code
            if (connection.getResponseCode() == 200) {
                JOptionPane.showMessageDialog(null, "Successfully to ban user (id: "+id+" ).", "Success", JOptionPane.INFORMATION_MESSAGE);
                return true;
            }else if (connection.getResponseCode() == 401) {
                JOptionPane.showMessageDialog(null, "Unauthorized: Fail to ban user (id: "+id+" ).", "Unauthorized", JOptionPane.ERROR_MESSAGE);
            }else if (connection.getResponseCode() == 403) {
                JOptionPane.showMessageDialog(null, "Forbidden: Admin privileges required.", "Forbidden", JOptionPane.ERROR_MESSAGE);
            }else{
                JOptionPane.showMessageDialog(null, "Fail to ban user (id: "+id+" ).", "Error", JOptionPane.ERROR_MESSAGE);
            }
        }catch (IOException e) {
            //using the ErrorHandler class to handle the exception
            ErrorHandler.handleIOException(e);
        }
        return false;
    }

    /**
     * Send a revalidate user request to the backend.
     * @param id The id of the user to be revalidated.
     * @return True if the revalidate user request is successful, false otherwise.
     */
    public Boolean sendRevalidateUserRequest(int id){
        try {
            //create the URL
            URL url = new URL(BACKEND_URL+"/admin/users/"+id+"/unban");
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();

            //set teh request method as POST
            connection.setRequestMethod("POST");
            connection.setRequestProperty("Authorization", "Bearer " + this.token);

            //send the request
            connection.connect();

            //check the response code
            if (connection.getResponseCode() == 200) {
                JOptionPane.showMessageDialog(null, "Successfully to unban user (id: "+id+" ).", "Success", JOptionPane.INFORMATION_MESSAGE);
                return true;
            }else if (connection.getResponseCode() == 401) {
                JOptionPane.showMessageDialog(null, "Unauthorised: Fail to unban user (id: "+id+" ).", "Unauthorised", JOptionPane.ERROR_MESSAGE);
            }else if (connection.getResponseCode() == 403) {
                JOptionPane.showMessageDialog(null, "Forbidden: Admin privileges required.", "Forbidden", JOptionPane.ERROR_MESSAGE);
            }else{
                JOptionPane.showMessageDialog(null, "Error: Fail to unban user (id: "+id+" ).", "Error", JOptionPane.ERROR_MESSAGE);
            }
        }catch (IOException e) {
            //using the ErrorHandler class to handle the exception
            ErrorHandler.handleIOException(e);
        }
        return false;
    }

    /**
     * 获取站点统计数据
     */
    public SiteStats getSiteStats() {
        try {
            URL url = new URL(BACKEND_URL + "/admin/stats");
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("GET");
            connection.setRequestProperty("Authorization", "Bearer " + this.token);
            connection.connect();

            if (connection.getResponseCode() == 200) {
                try (BufferedReader br = new BufferedReader(new InputStreamReader(connection.getInputStream()))) {
                    StringBuilder response = new StringBuilder();
                    String line;
                    while ((line = br.readLine()) != null) {
                        response.append(line);
                    }

                    ObjectMapper objectMapper = JacksonConfig.getConfiguredObjectMapper();
                    // 先解析为Map
                    Map<String, Map<String, Integer>> statsMap = objectMapper.readValue(response.toString(), 
                        new TypeReference<Map<String, Map<String, Integer>>>() {});
                    
                    // 创建并填充SiteStats对象
                    SiteStats stats = new SiteStats();
                    Map<String, Integer> users = statsMap.get("users");
                    Map<String, Integer> articles = statsMap.get("articles");
                    Map<String, Integer> comments = statsMap.get("comments");
                    
                    if (users != null) {
                        stats.setTotalUsers(users.get("total"));
                        stats.setActiveUsers(users.get("active"));
                        stats.setBannedUsers(users.get("banned"));
                    }
                    
                    if (articles != null) {
                        stats.setTotalArticles(articles.get("total"));
                    }
                    
                    if (comments != null) {
                        stats.setTotalComments(comments.get("total"));
                    }
                    
                    return stats;
                }
            } else if (connection.getResponseCode() == 401) {
                JOptionPane.showMessageDialog(null, "Unauthorized: Please login first", "Error", JOptionPane.ERROR_MESSAGE);
            } else if (connection.getResponseCode() == 403) {
                JOptionPane.showMessageDialog(null, "Forbidden: Admin privileges required", "Error", JOptionPane.ERROR_MESSAGE);
            }
        } catch (IOException e) {
            ErrorHandler.handleIOException(e);
        }
        return null;
    }

    /**
     * 获取所有文章列表
     */
    public List<Article> getAllArticles() {
        try {
            URL url = new URL(BACKEND_URL + "/admin/articles");
            System.out.println("Requesting articles from: " + url);
            
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("GET");
            connection.setRequestProperty("Authorization", "Bearer " + this.token);
            System.out.println("Using token: " + this.token);
            
            connection.connect();
            
            System.out.println("Response code: " + connection.getResponseCode());
            
            if (connection.getResponseCode() == 200) {
                try (BufferedReader br = new BufferedReader(new InputStreamReader(connection.getInputStream()))) {
                    StringBuilder response = new StringBuilder();
                    String line;
                    while ((line = br.readLine()) != null) {
                        response.append(line);
                    }

                    String responseStr = response.toString();
                    System.out.println("Articles response: " + responseStr);

                    if (responseStr.isEmpty()) {
                        System.out.println("Empty response from server");
                        return new ArrayList<>();
                    }

                    ObjectMapper objectMapper = JacksonConfig.getConfiguredObjectMapper();
                    try {
                        // 先解析为List<Map>
                        List<Map<String, Object>> articleMaps = objectMapper.readValue(responseStr, 
                            new TypeReference<List<Map<String, Object>>>() {});
                        
                        System.out.println("Parsed " + articleMaps.size() + " articles");
                        
                        List<Article> articles = new ArrayList<>();
                        for (Map<String, Object> map : articleMaps) {
                            try {
                                Article article = new Article();
                                System.out.println("Processing article: " + map);
                                
                                article.setId(((Number) map.get("id")).intValue());
                                article.setTitle((String) map.get("title"));
                                article.setContent((String) map.get("content"));
                                article.setAuthorUsername((String) map.get("authorUsername"));
                                
                                Object commentCount = map.get("commentCount");
                                if (commentCount != null) {
                                    article.setCommentCount(((Number) commentCount).intValue());
                                }
                                
                                Object viewCount = map.get("viewCount");
                                if (viewCount != null) {
                                    article.setViewCount(((Number) viewCount).intValue());
                                }
                                
                                article.setStatus((String) map.get("status"));
                                
                                // 处理日期
                                String createdAtStr = (String) map.get("createdAt");
                                if (createdAtStr != null) {
                                    System.out.println("CreatedAt string: " + createdAtStr);
                                    try {
                                        // 解析日期字符串
                                        String[] parts = createdAtStr.split(" ");
                                        String[] dateParts = parts[0].split("/");
                                        String[] timeParts = parts[1].split(":");
                                        
                                        LocalDateTime dateTime = LocalDateTime.of(
                                            Integer.parseInt(dateParts[0]), // year
                                            Integer.parseInt(dateParts[1]), // month
                                            Integer.parseInt(dateParts[2]), // day
                                            Integer.parseInt(timeParts[0]), // hour
                                            Integer.parseInt(timeParts[1]), // minute
                                            Integer.parseInt(timeParts[2])  // second
                                        );
                                        article.setCreatedAt(dateTime);
                                    } catch (Exception e) {
                                        System.out.println("Error parsing date: " + e.getMessage());
                                        article.setCreatedAt(LocalDateTime.now());
                                    }
                                }
                                
                                articles.add(article);
                            } catch (Exception e) {
                                System.out.println("Error processing article: " + e.getMessage());
                                e.printStackTrace();
                            }
                        }
                        
                        System.out.println("Returning " + articles.size() + " articles");
                        return articles;
                    } catch (Exception e) {
                        System.out.println("Error parsing JSON: " + e.getMessage());
                        e.printStackTrace();
                        return new ArrayList<>();
                    }
                }
            } else if (connection.getResponseCode() == 401) {
                System.out.println("Unauthorized access");
                JOptionPane.showMessageDialog(null, "Unauthorized: Please login first", "Error", JOptionPane.ERROR_MESSAGE);
            } else if (connection.getResponseCode() == 403) {
                System.out.println("Forbidden access");
                JOptionPane.showMessageDialog(null, "Forbidden: Admin privileges required", "Error", JOptionPane.ERROR_MESSAGE);
            } else {
                System.out.println("Unexpected response code: " + connection.getResponseCode());
                // 读取错误响应
                try (BufferedReader br = new BufferedReader(new InputStreamReader(connection.getErrorStream()))) {
                    StringBuilder errorResponse = new StringBuilder();
                    String line;
                    while ((line = br.readLine()) != null) {
                        errorResponse.append(line);
                    }
                    System.out.println("Error response: " + errorResponse.toString());
                }
            }
        } catch (IOException e) {
            System.out.println("IO Exception: " + e.getMessage());
            ErrorHandler.handleIOException(e);
            e.printStackTrace();
        }
        return new ArrayList<>();
    }

    /**
     * 删除文章
     */
    public boolean deleteArticle(int articleId) {
        try {
            URL url = new URL(BACKEND_URL + "/admin/articles/" + articleId);
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("DELETE");
            connection.setRequestProperty("Authorization", "Bearer " + this.token);
            connection.connect();

            if (connection.getResponseCode() == 200) {
                JOptionPane.showMessageDialog(null, "Article deleted successfully", "Success", JOptionPane.INFORMATION_MESSAGE);
                return true;
            } else if (connection.getResponseCode() == 401) {
                JOptionPane.showMessageDialog(null, "Unauthorized: Please login first", "Error", JOptionPane.ERROR_MESSAGE);
            } else if (connection.getResponseCode() == 403) {
                JOptionPane.showMessageDialog(null, "Forbidden: Admin privileges required", "Error", JOptionPane.ERROR_MESSAGE);
            }
        } catch (IOException e) {
            ErrorHandler.handleIOException(e);
        }
        return false;
    }

    /**
     * 获取所有评论列表
     */
    public List<Comment> getAllComments() {
        try {
            URL url = new URL(BACKEND_URL + "/admin/comments");
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("GET");
            connection.setRequestProperty("Authorization", "Bearer " + this.token);
            connection.connect();

            if (connection.getResponseCode() == 200) {
                try (BufferedReader br = new BufferedReader(new InputStreamReader(connection.getInputStream()))) {
                    StringBuilder response = new StringBuilder();
                    String line;
                    while ((line = br.readLine()) != null) {
                        response.append(line);
                    }

                    ObjectMapper objectMapper = JacksonConfig.getConfiguredObjectMapper();
                    return objectMapper.readValue(response.toString(), new TypeReference<List<Comment>>() {});
                }
            } else if (connection.getResponseCode() == 401) {
                JOptionPane.showMessageDialog(null, "Unauthorized: Please login first", "Error", JOptionPane.ERROR_MESSAGE);
            }
        } catch (IOException e) {
            ErrorHandler.handleIOException(e);
        }
        return new ArrayList<>();
    }

    /**
     * 删除评论
     */
    public boolean deleteComment(int commentId) {
        try {
            URL url = new URL(BACKEND_URL + "/admin/comments/" + commentId);
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("DELETE");
            connection.setRequestProperty("Authorization", "Bearer " + this.token);
            connection.connect();

            if (connection.getResponseCode() == 200) {
                JOptionPane.showMessageDialog(null, "Comment deleted successfully", "Success", JOptionPane.INFORMATION_MESSAGE);
                return true;
            } else if (connection.getResponseCode() == 401) {
                JOptionPane.showMessageDialog(null, "Unauthorized: Please login first", "Error", JOptionPane.ERROR_MESSAGE);
            } else if (connection.getResponseCode() == 403) {
                JOptionPane.showMessageDialog(null, "Forbidden: Admin privileges required", "Error", JOptionPane.ERROR_MESSAGE);
            }
        } catch (IOException e) {
            ErrorHandler.handleIOException(e);
        }
        return false;
    }

    /**
     * Get the current username.
     * @return The current username.
     */
    public String getCurrentUsername() {
        return currentUsername;
    }
}

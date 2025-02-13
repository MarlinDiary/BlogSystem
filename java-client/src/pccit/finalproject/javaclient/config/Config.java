package pccit.finalproject.javaclient.config;

/**
 * This class is used to store the configuration of the application
 */
public class Config {
    //This is used in the development environment
    public static final String BACKEND_URL = "http://localhost:3000/api";

    //This is used in the production environment
    //public static final String BACKEND_URL="https://blog-production-154c.up.railway.app/api";

    public static final String DEFAULT_AVATAR_URL = "http://localhost:3000/uploads/avatars/default.png";
}

package pccit.finalproject.javaclient;

import javax.swing.*;
import java.net.ConnectException;
import java.net.SocketTimeoutException;

/**
 * An error handler class that handles I/O exceptions.
 */
public class ErrorHandler {

    /**
     * Handles I/O exceptions.
     * @param e the exception to handle
     */
    public static void handleIOException(Exception e) {
        if (e instanceof ConnectException) {
            JOptionPane.showMessageDialog(null, "Unable to connect to the server. Please check your network connection", "Error", JOptionPane.ERROR_MESSAGE);
        } else if (e instanceof SocketTimeoutException) {
            JOptionPane.showMessageDialog(null, "Timed out. Please try again later.", "Error", JOptionPane.ERROR_MESSAGE);
        } else {
            JOptionPane.showMessageDialog(null, "An I/O error occurred:"+e.getMessage(), "Error", JOptionPane.ERROR_MESSAGE);
        }
        e.printStackTrace();
    }

}

package pccit.finalproject.javaclient;

import javax.swing.table.AbstractTableModel;
import javax.swing.table.DefaultTableCellRenderer;
import java.awt.*;
import java.util.List;

/**
 * The table model for the user table.
 */
public class UserTableModel extends AbstractTableModel {

    //list of users to display in the table.
    private final List<User> users;

    //column names
    private final String[] columnNames = {"ID", "Username", "Real Name", "Date of Birth", "Bio", "Avatar URL", "Created At", "status", "ArticleCount", "CommentCount", "HasAvatar"};

    /**
     * Constructor
     * @param users list of users to display in the table.
     */
    public UserTableModel(List<User> users) {this.users = users;}

    @Override
    public int getRowCount() {
        return users.size();
    }

    @Override
    public int getColumnCount() {
        return columnNames.length;
    }

    @Override
    public Object getValueAt(int rowIndex, int columnIndex) {
        User user = users.get(rowIndex);
        switch (columnIndex) {
            case 0:
                return user.getId();
            case 1:
                return user.getUsername();
            case 2:
                return user.getRealName();
            case 3:
                return user.getDateOfBirth();
            case 4:
                return user.getBio();
            case 5:
                return user.getAvatarUrl();
            case 6:
                return user.getCreatedAt();
            case 8:
                return user.getCommentCount();
            case 9:
                return user.getArticleCount();
            case 10:
                return user.getHasAvatar();
            case 7:
                return user.getStatus();
            default:
                return null;
        }
    }

    @Override
    public String getColumnName(int column) {
        return columnNames[column];
    }

    /**
     * a static method to get the renderer for the status column.
     */
    static class StatusColumnRenderer extends DefaultTableCellRenderer {

        /**
         * inside the status column set the visual effects for the cell.
         * @param value the value of the cell.
         */
        @Override
        protected void setValue(Object value) {
            if ("banned".equals(value.toString())) {
                //set the text color to red and make it bold.
                setForeground(Color.RED);
                setFont(getFont().deriveFont(Font.BOLD));
            }else{
                //set the text color back to black.
                setForeground(Color.BLACK);
                setFont(getFont().deriveFont(Font.PLAIN));
            }
            //set the text of the cell.
            setText(value.toString());
        }
    }
}


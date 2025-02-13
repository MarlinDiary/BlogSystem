package pccit.finalproject.javaclient.model;

import javax.swing.table.AbstractTableModel;
import java.time.format.DateTimeFormatter;
import java.util.List;

public class CommentTableModel extends AbstractTableModel {
    private final List<Comment> comments;
    private final String[] columnNames = {
        "ID", "Content", "Article", "Author", "Created At", 
        "Likes", "Status"
    };
    private final DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    public CommentTableModel(List<Comment> comments) {
        this.comments = comments;
    }

    @Override
    public int getRowCount() {
        return comments.size();
    }

    @Override
    public int getColumnCount() {
        return columnNames.length;
    }

    @Override
    public String getColumnName(int column) {
        return columnNames[column];
    }

    @Override
    public Object getValueAt(int rowIndex, int columnIndex) {
        Comment comment = comments.get(rowIndex);
        switch (columnIndex) {
            case 0:
                return comment.getId();
            case 1:
                return comment.getContent();
            case 2:
                return comment.getArticleTitle();
            case 3:
                return comment.getAuthorUsername();
            case 4:
                return comment.getCreatedAt().format(formatter);
            case 5:
                return comment.getLikeCount();
            case 6:
                return comment.getStatus();
            default:
                return null;
        }
    }

    public Comment getCommentAt(int row) {
        return comments.get(row);
    }
} 
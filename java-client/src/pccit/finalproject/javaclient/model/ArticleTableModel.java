package pccit.finalproject.javaclient.model;

import javax.swing.table.AbstractTableModel;
import java.time.format.DateTimeFormatter;
import java.util.List;

public class ArticleTableModel extends AbstractTableModel {
    private final List<Article> articles;
    private final String[] columnNames = {
        "ID", "Title", "Author", "Created At", "Views", 
        "Comments", "Status"
    };
    private final DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    public ArticleTableModel(List<Article> articles) {
        this.articles = articles;
    }

    @Override
    public int getRowCount() {
        return articles.size();
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
        Article article = articles.get(rowIndex);
        switch (columnIndex) {
            case 0:
                return article.getId();
            case 1:
                return article.getTitle();
            case 2:
                return article.getAuthorUsername();
            case 3:
                return article.getCreatedAt() != null ? article.getCreatedAt().format(formatter) : "";
            case 4:
                return article.getViewCount();
            case 5:
                return article.getCommentCount();
            case 6:
                return article.getStatus();
            default:
                return null;
        }
    }

    public Article getArticleAt(int row) {
        return articles.get(row);
    }
} 
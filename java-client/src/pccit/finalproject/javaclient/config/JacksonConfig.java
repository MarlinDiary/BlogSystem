package pccit.finalproject.javaclient.config;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.fasterxml.jackson.datatype.jsr310.deser.LocalDateTimeDeserializer;
import com.fasterxml.jackson.datatype.jsr310.ser.LocalDateTimeSerializer;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeFormatterBuilder;
import java.time.temporal.ChronoField;

/**
 * This class is used to configure Jackson.
 *  This class configures how Jackson processes dates and times.
 */
public class JacksonConfig {
    private static final DateTimeFormatter DATE_TIME_FORMATTER = new DateTimeFormatterBuilder()
        .appendPattern("yyyy/M/d HH:mm:ss")
        .parseDefaulting(ChronoField.NANO_OF_SECOND, 0)
        .toFormatter();

    /**
     * This method creates and returns a configured ObjectMapper.
     * @return ObjectMapper
     */
    public static ObjectMapper getConfiguredObjectMapper() {
        ObjectMapper objectMapper = new ObjectMapper();

        // Register the JavaTimeModule to handle dates and times
        JavaTimeModule javaTimeModule = new JavaTimeModule();
        
        // 设置LocalDateTime的序列化和反序列化器
        javaTimeModule.addSerializer(LocalDateTime.class, new LocalDateTimeSerializer(DATE_TIME_FORMATTER));
        javaTimeModule.addDeserializer(LocalDateTime.class, new LocalDateTimeDeserializer(DATE_TIME_FORMATTER));
        
        objectMapper.registerModule(javaTimeModule);

        // Allow deserialization of single values into arrays (flexible JSON parsing)
        objectMapper.configure(DeserializationFeature.ACCEPT_SINGLE_VALUE_AS_ARRAY, true);

        // Ignore unknown properties
        objectMapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

        // Read date timestamps as milliseconds instead of nanoseconds for compatibility
        objectMapper.configure(DeserializationFeature.READ_DATE_TIMESTAMPS_AS_NANOSECONDS, false);

        return objectMapper;
    }
}

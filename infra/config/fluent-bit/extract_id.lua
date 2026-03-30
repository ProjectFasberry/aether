function extract_id(tag, timestamp, record)
    local name = tag:match("%.([^%.]+)$")
    record["container_name"] = name or "unknown"
    record["server_name"] = os.getenv("SERVER_NAME") or "unknown_host"
    
    return 1, timestamp, record
end
-- Atomic Token Generation Script for QueueLess India
-- KEYS[1]: counter:branch:{branchId}:{date_ist}
-- ARGV[1]: ttl_seconds (default: 172800 for 48 hours to survive IST rollover)

local current = redis.call('INCR', KEYS[1])
if current == 1 then
    local ttl = tonumber(ARGV[1]) or 172800
    redis.call('EXPIRE', KEYS[1], ttl)
end

return current

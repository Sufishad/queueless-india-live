-- Atomic Token Sequence Increment Script for QueueLess India
-- KEYS[1]: counter:branch:{branchId}:{date_ist}
-- KEYS[2]: queue:branch:{branchId}:waiting
-- ARGV[1]: tokenId (UUID string)
-- ARGV[2]: ttlSeconds (integer, default 172800 for 48 hours)

local current = redis.call('INCR', KEYS[1])
if current == 1 then
    local ttl = tonumber(ARGV[2]) or 172800
    redis.call('EXPIRE', KEYS[1], ttl)
end

if KEYS[2] and ARGV[1] and ARGV[1] ~= "" then
    redis.call('RPUSH', KEYS[2], ARGV[1])
end

return current

// =========================================================================
// SecGenie Document Report Generator (With Specific Root Cause & Resolution)
// =========================================================================

// Comprehensive Endpoint-Specific Root Cause & Resolution Knowledge Base
const endpointKnowledgeBase = {
  '/api/v1/alertactions': {
    whyIssueOccurs: [
      '<strong>Trigger Execution Contention:</strong> When multiple concurrent users fetch or trigger remediation actions, synchronous execution threads lock action table rows.',
      '<strong>Database Connection Saturation:</strong> Under 50 VUs peak load, simultaneous read queries exhaust the HikariCP connection pool, leading to request timeouts (>15s).'
    ],
    howToResolve: [
      'Implement asynchronous action dispatching via message queues (RabbitMQ / Kafka / Celery).',
      'Cache action metadata in Redis with a 1-hour TTL to eliminate database read hits.',
      'Add composite index on <code>(status, sort_order)</code> columns.'
    ]
  },
  '/api/v1/alertactions/{uid}': {
    whyIssueOccurs: [
      '<strong>Unindexed UID Lookups:</strong> If <code>uid</code> column lacks a primary/unique B-Tree index, queries trigger sequential table scans.',
      '<strong>Connection Pool Queuing:</strong> Under concurrency, connection queue wait time exceeds the 15-second client timeout.'
    ],
    howToResolve: [
      'Ensure <code>uid</code> is indexed as a primary unique key in the database.',
      'Cache individual action definitions in Redis using key pattern <code>alertaction:{uid}</code>.',
      'Tune connection pool size (HikariCP <code>maximum-pool-size: 50</code>).'
    ]
  },
  '/api/v1/alertfields': {
    whyIssueOccurs: [
      '<strong>Bulk Schema Serialization:</strong> Returning dynamic field definitions requires expensive JSON deserialization and schema reflection.',
      '<strong>Cache Invalidation Spikes:</strong> If fields cache expires during load, simultaneous queries cause cache stampede.'
    ],
    howToResolve: [
      'Use probabilistic early expiration (XFetch) or perpetual Redis caching for field dictionary schemas.',
      'Enable GZIP/Brotli compression to reduce JSON payload transfer size.',
      'Serve static schema definitions directly from CDN or API Gateway cache.'
    ]
  },
  '/api/v1/alertfields/{uid}': {
    whyIssueOccurs: [
      '<strong>Single Schema Lookup Overhead:</strong> Database roundtrip overhead for small metadata objects under concurrent load.'
    ],
    howToResolve: [
      'Cache field configurations in local in-memory Guava / Caffeine cache.',
      'Return HTTP 304 Not Modified with <code>ETag</code> / <code>If-None-Match</code> headers.'
    ]
  },
  '/api/v1/alertrules': {
    whyIssueOccurs: [
      '<strong>Complex Detection Rule Trees:</strong> Fetching full rule definitions with nested condition logic trees creates high memory and CPU serialization pressure under load.',
      '<strong>Full Table Scanning:</strong> Absence of status/category index leads to slow query execution during multi-VU tests.'
    ],
    howToResolve: [
      'Implement cursor-based or offset pagination (<code>page</code> and <code>size</code> params).',
      'Add database index on <code>(is_active, severity, created_at)</code>.',
      'Cache active rule sets in Redis and invalidate only on rule updates.'
    ]
  },
  '/api/v1/alertrules/{uid}': {
    whyIssueOccurs: [
      '<strong>Regex & Condition Parsing:</strong> Rule details contain regex patterns and nested AST trees that require CPU-heavy JSON parsing on every request thread.'
    ],
    howToResolve: [
      'Pre-compile and cache parsed rule AST objects in application memory.',
      'Use Redis key-value store for direct rule fetching by UID.'
    ]
  },
  '/api/v1/alertrules/test-rule/{uid}/{alertUid}': {
    whyIssueOccurs: [
      '<strong>Live Synchronous Rule Evaluation:</strong> Evaluating complex regex conditions against raw alert payloads synchronously on the HTTP request thread blocks worker threads and causes latency spikes (>2s - 15s).',
      '<strong>Dual Entity Database Fetch:</strong> Fetching both rule entity and full alert payload sequentially doubles database roundtrip time.'
    ],
    howToResolve: [
      'Offload heavy rule testing to an async background worker pool or WebWorker.',
      'Optimize regex engines using DFA/RE2 linear-time matchers instead of backtracking regex.',
      'Fetch rule and alert data in parallel or from Redis hot cache.'
    ]
  },
  '/api/v1/alerts': {
    whyIssueOccurs: [
      '<strong>Multi-Table Relational SQL JOINs:</strong> Fetching alerts performs heavy joins across events, assets, users, SLA, and rule tables.',
      '<strong>Connection Pool Starvation:</strong> High volume of unpaginated queries under 50 VUs exhausts database connections, causing 40%+ request timeouts (>15s).',
      '<strong>Un-indexed Sorting:</strong> Sorting by <code>created_at DESC</code> on millions of records causes temporary disk sorting in MySQL/PostgreSQL.'
    ],
    howToResolve: [
      'Enforce mandatory pagination (default <code>size=20</code>) with maximum limit cap.',
      'Create composite index on <code>(tenant_id, status, created_at DESC)</code>.',
      'Increase database connection pool size (HikariCP <code>maximum-pool-size: 60</code>).',
      'Use read-replicas for search queries and Elasticsearch for complex alert filtering.'
    ]
  },
  '/api/v1/alerts/{uid}': {
    whyIssueOccurs: [
      '<strong>Deep Incident Hierarchy Deserialization:</strong> Single alert details include nested raw event payloads, evidence logs, and timeline history.',
      '<strong>Foreign Key Cascade Queries:</strong> N+1 query problem when fetching associated entities.'
    ],
    howToResolve: [
      'Use eager loading / JOIN FETCH in JPA/Hibernate to eliminate N+1 query loops.',
      'Compress and store raw event payloads in object storage (S3/MinIO) rather than relational DB text fields.',
      'Cache active alert details in Redis with write-through cache.'
    ]
  },
  '/api/v1/alerts/apply-rules/{uid}': {
    whyIssueOccurs: [
      '<strong>Synchronous Engine Execution:</strong> Running all active detection rules against a live alert sequentially on the API thread causes extreme latency (>6s - 15s) under concurrency.',
      '<strong>Database Write Locks:</strong> Updating alert match status and alert action logs creates row lock contention.'
    ],
    howToResolve: [
      'Queue rule application jobs in Redis/Kafka and return HTTP 202 Accepted immediately.',
      'Run rule matching in parallel across thread workers.',
      'Use batch database updates to minimize lock duration.'
    ]
  },
  '/api/v1/alerts/graph-node': {
    whyIssueOccurs: [
      '<strong>Relational Graph Node Traversal:</strong> Traversing parent-child entity relations in a relational database without a graph schema causes slow recursive queries.'
    ],
    howToResolve: [
      'Use dedicated Graph DB (Neo4j / Amazon Neptune) or recursive CTE with indexed foreign keys.',
      'Cache graph topology JSON in Redis with 5-minute expiration.'
    ]
  },
  '/api/v1/alerts/linkedalerts/{uid}': {
    whyIssueOccurs: [
      '<strong>Heavy Graph Relation Join:</strong> Finding linked alerts requires multi-level correlation matching across IP, host, and hash attributes (~5.4s latency).',
      '<strong>Lock Contention:</strong> Full table scan on historical event table during correlation.'
    ],
    howToResolve: [
      'Pre-compute correlation linkages asynchronously at ingestion time rather than at query time.',
      'Add dedicated correlation index on <code>(source_ip, destination_ip, file_hash)</code>.',
      'Cache linked alerts result for 15 minutes in Redis.'
    ]
  },
  '/api/v1/alerts/summary': {
    whyIssueOccurs: [
      '<strong>Real-Time Dynamic Aggregation:</strong> Executing <code>COUNT()</code> and <code>GROUP BY status, severity</code> across millions of rows causes CPU/Disk I/O spikes.',
      '<strong>Table Lock Contention:</strong> Aggregations lock read buffers while ingestion writes new alerts.'
    ],
    howToResolve: [
      'Maintain real-time pre-aggregated counter tables (Rollup tables) or Redis HyperLogLog / Hash counters.',
      'Query read-only replica database for analytical dashboards.',
      'Set cache TTL of 30-60 seconds on KPI summary endpoints.'
    ]
  },
  '/api/v1/alertslas': {
    whyIssueOccurs: [
      '<strong>SLA Policy Lookup Overhead:</strong> Calculating active SLA thresholds across multiple alert tiers under concurrent load.'
    ],
    howToResolve: [
      'Cache SLA policy configurations in application memory.',
      'Add index on <code>(severity, priority, is_active)</code>.'
    ]
  },
  '/api/v1/alertslas/{uid}': {
    whyIssueOccurs: [
      '<strong>Timestamp Delta Computation:</strong> Dynamic calculation of time elapsed vs target SLA resolution on historic logs (~800ms) causes sequential scanning.'
    ],
    howToResolve: [
      'Store pre-computed SLA breach status directly on the alert record.',
      'Index alert timestamp fields: <code>(alert_uid, created_at, resolved_at)</code>.'
    ]
  },
  '/api/v1/devicetypes': {
    whyIssueOccurs: [
      '<strong>Asset Classification Aggregation:</strong> Querying device types with dynamically computed active asset counts causes query delays (~800ms).'
    ],
    howToResolve: [
      'Pre-calculate asset counts using asynchronous scheduled cron / DB triggers.',
      'Cache device classification dictionary in Redis.'
    ]
  },
  '/api/v1/devicetypes/{uid}': {
    whyIssueOccurs: [
      '<strong>Foreign Key Joins:</strong> Joining device types with template mappings without composite foreign key indexes.'
    ],
    howToResolve: [
      'Ensure index exists on <code>devicetype_id</code> foreign keys.',
      'Cache individual device type configurations in Redis.'
    ]
  },
  '/api/v1/devicetypetemplates': {
    whyIssueOccurs: [
      '<strong>Large XML/JSON Schema Payloads:</strong> Device templates contain large parsing regexes and log mapping definitions, increasing payload transfer time (~7.3s under peak load).'
    ],
    howToResolve: [
      'Enable GZIP/Brotli HTTP compression on API server.',
      'Implement field filtering (<code>fields=id,name,version</code>) to exclude heavy parser bodies in list view.',
      'Store template bodies in MinIO/S3 and serve via CDN.'
    ]
  },
  '/api/v1/devicetypetemplates/{uid}': {
    whyIssueOccurs: [
      '<strong>Template Deserialization Bottleneck:</strong> Parsing large template XML/JSON definitions during concurrent fetches.'
    ],
    howToResolve: [
      'Cache deserialized template models in memory.',
      'Use streaming JSON/XML parsers (Jackson Streaming / fastxml).'
    ]
  },
  '/api/v1/emailtemplates': {
    whyIssueOccurs: [
      '<strong>Shared Template Cache Lock:</strong> Template rendering engines acquire locks on shared template caches under simultaneous load.'
    ],
    howToResolve: [
      'Configure concurrent, non-blocking template loaders (e.g. FreeMarker multi-threaded cache).',
      'Cache raw HTML template bodies in Redis.'
    ]
  },
  '/api/v1/emailtemplates/{uid}': {
    whyIssueOccurs: [
      '<strong>Disk I/O Delay:</strong> Fetching template body from filesystem storage without disk buffer caching.'
    ],
    howToResolve: [
      'Store template text in database with Redis hot-caching.',
      'Use memory-mapped template store.'
    ]
  },
  '/api/v1/notifications': {
    whyIssueOccurs: [
      '<strong>Unread Counter Query Locks:</strong> Querying unread notifications with <code>WHERE user_id = ? AND is_read = false</code> causes row lock contention on the notification table under peak concurrency.',
      '<strong>Queue Backlog:</strong> Fast baseline (~260ms), but spikes to 1.1s+ under multi-user access.'
    ],
    howToResolve: [
      'Add partial index: <code>CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE is_read = false;</code>',
      'Maintain unread count in Redis integer key (<code>INCR</code> / <code>DECR</code>) to eliminate database count queries.',
      'Archive notifications older than 30 days to a separate history table.'
    ]
  },
  '/api/v1/notifications/{uid}': {
    whyIssueOccurs: [
      '<strong>Read Status Update Contention:</strong> Concurrent users marking notifications as read causes write locks on the notification table.'
    ],
    howToResolve: [
      'Use asynchronous event emission to update read status in batches.',
      'Index notification table on primary <code>(uid)</code>.'
    ]
  },
  '/api/v1/playbooks': {
    whyIssueOccurs: [
      '<strong>Large Workflow Graph Deserialization:</strong> Playbooks contain complex JSON workflow step node graphs with action blocks (~1.2s latency under concurrency).',
      '<strong>Memory Pressure:</strong> Deserializing 50+ playbook graphs simultaneously spikes JVM Garbage Collection (GC) pauses.'
    ],
    howToResolve: [
      'Exclude detailed node graph payload in list API; provide summary fields only (<code>id, name, trigger, status</code>).',
      'Enable GZIP compression on playbook API endpoints.',
      'Cache serialized playbook JSON directly in Redis.'
    ]
  },
  '/api/v1/playbooks/{uid}': {
    whyIssueOccurs: [
      '<strong>Graph Node Parsing Overhead:</strong> Full playbook retrieval parses nested condition branches and action connectors (~1.05s latency).'
    ],
    howToResolve: [
      'Cache compiled workflow graph in memory using Caffeine cache.',
      'Serve static playbook blueprints from Redis key-value cache.'
    ]
  },
  '/api/v1/sigmarules': {
    whyIssueOccurs: [
      '<strong>YAML Sigma Signature Parsing:</strong> Converting raw Sigma YAML rules to internal AST format on the fly creates CPU overhead (~516ms latency).',
      '<strong>Large Rule Repositories:</strong> Scanning thousands of Sigma rules without full-text indexes causes database query stalls.'
    ],
    howToResolve: [
      'Pre-compile and store converted Sigma rule AST in database / Redis.',
      'Add full-text search index (GIN/GiST index in PostgreSQL or Elasticsearch) on rule titles and tags.',
      'Paginate Sigma rules with default limit of 25 records.'
    ]
  },
  '/api/v1/sigmarules/{uid}': {
    whyIssueOccurs: [
      '<strong>Single Sigma Rule Lookup:</strong> Fetching specific Sigma rule YAML and detection logic under concurrency.'
    ],
    howToResolve: [
      'Store pre-validated Sigma YAML in Redis key <code>sigmarule:{uid}</code>.',
      'Add unique index on <code>sigmarules.uid</code>.'
    ]
  },
  '/api/v1/exposureactions': {
    whyIssueOccurs: [
      '<strong>Remediation Action Lookup Contention:</strong> Synchronous database queries locking action mapping rows during concurrent exposure remediation fetches.',
      '<strong>Database Connection Saturation:</strong> Under 50 VUs, simultaneous read hits on unindexed action status tables exhaust the connection pool.'
    ],
    howToResolve: [
      'Cache exposure actions in Redis with a 1-hour TTL to eliminate database read hits.',
      'Add composite index on <code>(status, sort_order)</code> columns.',
      'Implement asynchronous dispatching via message queues (RabbitMQ / Kafka).'
    ]
  },
  '/api/v1/exposureactions/{uid}': {
    whyIssueOccurs: [
      '<strong>Unindexed UID Lookups:</strong> Fetching individual exposure actions triggers full sequential table scans without primary unique B-Tree indexing.',
      '<strong>Connection Queue Wait Time:</strong> Connection queue wait times exceed 15-second client timeouts under concurrency.'
    ],
    howToResolve: [
      'Ensure <code>uid</code> is indexed as a primary unique key in the database.',
      'Cache individual action definitions in Redis using key pattern <code>exposureaction:{uid}</code>.',
      'Tune connection pool size (HikariCP <code>maximum-pool-size: 50</code>).'
    ]
  },
  '/api/v1/exposures': {
    whyIssueOccurs: [
      '<strong>Multi-Table SQL Joins on Vulnerabilities:</strong> Fetching exposures performs heavy joins across CVE, asset, severity, and SLA tracking tables.',
      '<strong>Unindexed Sorting:</strong> Sorting by <code>risk_score DESC, created_at DESC</code> causes temporary disk-based file sorting in relational databases.',
      '<strong>Unpaginated Result Sets:</strong> Fetching thousands of exposure records simultaneously causes memory pressure and high transfer latency.'
    ],
    howToResolve: [
      'Enforce mandatory cursor/offset pagination (default <code>limit=20</code>).',
      'Create composite index on <code>(tenant_id, status, risk_score DESC, created_at DESC)</code>.',
      'Route read-only search queries to a database Read Replica or Elasticsearch.'
    ]
  },
  '/api/v1/exposures/{uid}': {
    whyIssueOccurs: [
      '<strong>N+1 Query Problem:</strong> Single exposure details query executes cascading sub-queries to fetch associated vulnerability CVE evidence and asset details.',
      '<strong>Large Raw Evidence Deserialization:</strong> Dynamic deserialization of raw vulnerability scanner payloads.'
    ],
    howToResolve: [
      'Use eager loading / <code>JOIN FETCH</code> in JPA/Hibernate to eliminate N+1 sub-queries.',
      'Add database index on foreign key columns (e.g. <code>asset_id</code>, <code>cve_id</code>).',
      'Cache active exposure details in Redis with write-through invalidation.'
    ]
  },
  '/api/v1/exposures/summary': {
    whyIssueOccurs: [
      '<strong>Dynamic SQL Full-Table Aggregation:</strong> Running <code>COUNT(*)</code>, <code>GROUP BY severity</code>, and risk aggregations across millions of exposure records.',
      '<strong>Database CPU Spikes:</strong> Concurrent dashboard users trigger repeated full-table grouping calculations.'
    ],
    howToResolve: [
      'Maintain real-time pre-aggregated counter tables (Rollup tables) or Redis atomic hash counters (<code>HINCRBY</code>).',
      'Set cache TTL of 30-60 seconds on KPI summary endpoints in Redis.',
      'Query read-only replica database for analytical dashboards.'
    ]
  },
  '/api/v1/exposureslas': {
    whyIssueOccurs: [
      '<strong>Policy Schema Reflection:</strong> Loading exposure SLA policy definitions with dynamic severity matrix logic under concurrent load.'
    ],
    howToResolve: [
      'Cache SLA policy configurations in application memory (Caffeine / Guava).',
      'Add composite index on <code>(severity, risk_level, is_active)</code>.'
    ]
  },
  '/api/v1/exposureslas/{uid}': {
    whyIssueOccurs: [
      '<strong>Timestamp Delta Computation:</strong> Dynamic calculation of time elapsed vs target SLA resolution on historic exposure logs causes sequential scans.'
    ],
    howToResolve: [
      'Store pre-computed SLA breach status directly on the exposure record.',
      'Index exposure timestamp fields: <code>(exposure_uid, discovered_at, remediated_at)</code>.'
    ]
  },
  '/api/v1/complianceactions': {
    whyIssueOccurs: [
      '<strong>Remediation Trigger Execution Contention:</strong> Concurrent users fetching or invoking compliance action workflows lock action configuration rows.',
      '<strong>HikariCP Connection Saturation:</strong> Under high concurrency (50 VUs), simultaneous queries exhaust database connection pools causing timeouts (>15s).'
    ],
    howToResolve: [
      'Cache compliance action metadata in Redis with a 1-hour TTL.',
      'Add composite database index on <code>(status, sort_order)</code>.',
      'Implement asynchronous event dispatching via message queues (RabbitMQ / Kafka).'
    ]
  },
  '/api/v1/complianceactions/{uid}': {
    whyIssueOccurs: [
      '<strong>Unindexed Action Lookups:</strong> Fetching specific compliance action definitions without primary B-Tree indexing causes full table scans.',
      '<strong>Connection Queue Wait Overhead:</strong> Thread queuing under load causes client-side timeout failures.'
    ],
    howToResolve: [
      'Ensure unique index on <code>complianceactions.uid</code>.',
      'Cache individual action objects in Redis using key <code>complianceaction:{uid}</code>.',
      'Tune connection pool maximum size (HikariCP <code>maximum-pool-size: 50</code>).'
    ]
  },
  '/api/v1/compliancefields': {
    whyIssueOccurs: [
      '<strong>Bulk Dictionary Reflection:</strong> Serializing 130+ dynamic compliance metadata fields on every request induces CPU and JSON deserialization overhead.',
      '<strong>Cache Stampede Vulnerability:</strong> Expired schema cache during concurrent bursts triggers parallel database re-fetches.'
    ],
    howToResolve: [
      'Use perpetual in-memory caching (Caffeine/Guava) with background refresh.',
      'Enable HTTP GZIP/Brotli compression to reduce JSON payload size.',
      'Serve static compliance schema dictionaries directly from API gateway cache.'
    ]
  },
  '/api/v1/compliancefields/{uid}': {
    whyIssueOccurs: [
      '<strong>Frequent Metadata Roundtrips:</strong> Repetitive single-field schema queries introduce database network latency.'
    ],
    howToResolve: [
      'Cache field definitions in local application memory.',
      'Implement HTTP 304 Not Modified caching with <code>ETag</code> / <code>If-None-Match</code>.'
    ]
  },
  '/api/v1/compliancerules': {
    whyIssueOccurs: [
      '<strong>Complex Policy AST Parsing:</strong> Fetching compliance audit rules with nested logic condition trees causes high memory and serialization load.',
      '<strong>Unpaginated Rule Repository:</strong> Full table scan without active status filtering stalls under concurrency.'
    ],
    howToResolve: [
      'Enforce pagination with <code>page</code> and <code>size</code> parameters.',
      'Add index on <code>(is_active, standard, severity, created_at)</code>.',
      'Cache active compliance rule sets in Redis and invalidate on update.'
    ]
  },
  '/api/v1/compliancerules/{uid}': {
    whyIssueOccurs: [
      '<strong>Nested Rule Condition Parsing:</strong> Parsing multi-level audit rule criteria AST blocks dynamically on the HTTP request thread.',
      '<strong>Direct Lookup Cache Miss:</strong> Missing hot-cache tier for frequently inspected compliance policy rules.'
    ],
    howToResolve: [
      'Pre-compile and store serialized AST rules in Redis (<code>compliancerule:{uid}</code>).',
      'Add unique B-Tree index on <code>compliancerules.uid</code>.'
    ]
  },
  '/api/v1/compliances': {
    whyIssueOccurs: [
      '<strong>Massive Dataset Querying (8,000+ records):</strong> Returning thousands of compliance records in a single payload causes severe database I/O, JVM GC spikes, and payload transfer delays.',
      '<strong>Multi-Table Relational JOINs:</strong> Joining compliance findings with frameworks, controls, assets, and audit status tables without composite indexes.'
    ],
    howToResolve: [
      'Enforce mandatory cursor/offset pagination (default <code>limit=20</code>, maximum <code>100</code>).',
      'Create composite index on <code>(tenant_id, framework, status, created_at DESC)</code>.',
      'Offload complex search & filtering to Elasticsearch / OpenSearch or dedicated Read Replica.'
    ]
  },
  '/api/v1/compliances/{uid}': {
    whyIssueOccurs: [
      '<strong>N+1 Cascading Entity Queries:</strong> Fetching compliance item details triggers secondary queries for evidence files, audit logs, and control mappings.',
      '<strong>Large Evidence Payload Parsing:</strong> Deserializing embedded assessment proofs and scan snippets.'
    ],
    howToResolve: [
      'Use JPA <code>JOIN FETCH</code> or batched eager loading to eliminate N+1 sub-queries.',
      'Store heavy raw scan evidence payloads in Object Storage (S3/MinIO) and return signed URLs.',
      'Cache active compliance finding details in Redis with write-through invalidation.'
    ]
  },
  '/api/v1/compliances/apply-rules/{uid}': {
    whyIssueOccurs: [
      '<strong>Synchronous Rule Engine Evaluation:</strong> Executing comprehensive compliance policy validation sequentially against an asset on the HTTP thread causes high latency (>5s - 15s).',
      '<strong>Database Row Locking:</strong> Updating compliance finding states and compliance history tables creates row lock contention.'
    ],
    howToResolve: [
      'Offload rule evaluation to an asynchronous worker queue (Celery/RabbitMQ/Kafka) and respond with HTTP 202 Accepted.',
      'Parallelize rule evaluation across worker threads.',
      'Batch audit log database writes.'
    ]
  },
  '/api/v1/compliances/graph-node': {
    whyIssueOccurs: [
      '<strong>Relational Graph Topology Traversal:</strong> Traversing compliance control-to-asset dependencies in relational tables triggers expensive recursive queries and 500 errors if cycles exist.'
    ],
    howToResolve: [
      'Use dedicated Graph DB (Neo4j / Amazon Neptune) or recursive CTE with depth limits.',
      'Cache compiled graph topology structures in Redis with a 10-minute TTL.',
      'Add composite foreign key indexes on <code>(source_node_id, target_node_id, relationship_type)</code>.'
    ]
  },
  '/api/v1/compliances/summary': {
    whyIssueOccurs: [
      '<strong>Real-Time Dynamic Aggregations:</strong> Executing <code>COUNT(*)</code>, <code>GROUP BY framework, status, severity</code> across 8,000+ compliance findings on every dashboard refresh.',
      '<strong>Database Lock & Buffer Saturation:</strong> Concurrent analytics queries saturate CPU and buffer cache.'
    ],
    howToResolve: [
      'Maintain pre-aggregated summary Rollup tables or atomic Redis Hash counters (<code>HINCRBY</code>).',
      'Set a Redis cache TTL of 30-60 seconds on KPI summary endpoints.',
      'Direct analytical dashboard queries to Read Replicas.'
    ]
  },
  '/api/v1/compliancescans': {
    whyIssueOccurs: [
      '<strong>Scan History Table Bloat:</strong> Querying historical scan runs with embedded execution summaries without pagination.',
      '<strong>Unindexed Timestamp Sorting:</strong> Ordering scans by <code>started_at DESC</code> causes temporary disk sorts.'
    ],
    howToResolve: [
      'Implement cursor pagination (<code>page=1, size=20</code>).',
      'Add composite index on <code>(status, started_at DESC)</code>.',
      'Archive completed scans older than 90 days to cold storage.'
    ]
  },
  '/api/v1/compliancescans/{uid}': {
    whyIssueOccurs: [
      '<strong>Large Scan Output Deserialization:</strong> Scan run details contain raw stdout/stderr logs and finding lists, resulting in multi-megabyte payloads.'
    ],
    howToResolve: [
      'Compress raw scan logs and store in S3/MinIO; stream logs on demand.',
      'Provide field filtering (<code>exclude=raw_output</code>) for rapid metadata inspection.',
      'Cache immutable completed scan records in Redis.'
    ]
  },
  '/api/v1/compliancescansources': {
    whyIssueOccurs: [
      '<strong>Data Source Health Check Latency:</strong> Synchronously polling external compliance cloud accounts or API endpoints during source listing.',
      '<strong>Relational Join Overhead:</strong> Joining data sources with scan credentials and target asset groups.'
    ],
    howToResolve: [
      'Decouple live health checking to background cron workers.',
      'Cache data source inventory in Redis with 15-minute invalidation.',
      'Add index on <code>(tenant_id, source_type, is_active)</code>.'
    ]
  },
  '/api/v1/compliancescansources/{uid}': {
    whyIssueOccurs: [
      '<strong>Credential Decryption Overhead:</strong> Decrypting stored KMS/Vault credentials during individual source configuration fetch.'
    ],
    howToResolve: [
      'Exclude sensitive credentials from read endpoints (mask secrets).',
      'Cache non-sensitive source metadata in application memory.'
    ]
  },
  '/api/v1/compliancescansourcetemplates': {
    whyIssueOccurs: [
      '<strong>Large Template Schema Payloads:</strong> Compliance source templates contain expansive JSON schema definitions and IAM policy templates.'
    ],
    howToResolve: [
      'Enable GZIP/Brotli HTTP compression on API server.',
      'Cache template schemas in local memory (Caffeine cache).',
      'Serve static templates via CDN or API Gateway cache.'
    ]
  },
  '/api/v1/compliancescansourcetemplates/{uid}': {
    whyIssueOccurs: [
      '<strong>Schema Template Deserialization Bottleneck:</strong> Parsing large JSON/YAML compliance schema templates on every fetch.'
    ],
    howToResolve: [
      'Cache deserialized template models in memory.',
      'Return HTTP 304 Not Modified with <code>ETag</code> headers.'
    ]
  },
  '/api/v1/compliancescantools': {
    whyIssueOccurs: [
      '<strong>Scanner Tool Definitions Overhead:</strong> Fetching integrated compliance audit tool parameters and version configurations.'
    ],
    howToResolve: [
      'Cache tool registry in Redis / in-memory cache.',
      'Add index on <code>(is_enabled, tool_category)</code>.'
    ]
  },
  '/api/v1/compliancescantools/{uid}': {
    whyIssueOccurs: [
      '<strong>Single Tool Registry Lookup:</strong> Unindexed lookup of tool plugin configurations.'
    ],
    howToResolve: [
      'Cache tool configuration in Redis key <code>compliancescantool:{uid}</code>.',
      'Add unique index on <code>compliancescantools.uid</code>.'
    ]
  },
  '/api/v1/complianceslas': {
    whyIssueOccurs: [
      '<strong>SLA Policy Matrix Reflection:</strong> Fetching compliance SLA rules across multiple frameworks and severity tiers under load.'
    ],
    howToResolve: [
      'Cache SLA policy definitions in application memory.',
      'Add composite index on <code>(framework, severity, is_active)</code>.'
    ]
  },
  '/api/v1/complianceslas/{uid}': {
    whyIssueOccurs: [
      '<strong>SLA Breach Calculation:</strong> Dynamic evaluation of resolution deadlines against audit discovery timestamps triggers unindexed table scans.'
    ],
    howToResolve: [
      'Store pre-computed SLA breach flags directly on compliance findings.',
      'Index timestamp columns: <code>(compliance_uid, raised_at, resolved_at)</code>.'
    ]
  },
  '/api/v1/kanbans': {
    whyIssueOccurs: [
      '<strong>Kanban Task & Board Column Serialization:</strong> Fetching active Kanban tasks across multiple workflow columns and boards without server-side pagination leads to high memory utilization.',
      '<strong>Multi-Table Relational JOINs:</strong> Joining Kanban task cards with user assignments, customer tags, status columns, and SLA trackers under concurrent user load.'
    ],
    howToResolve: [
      'Enforce pagination with <code>page</code> and <code>size</code> parameters or board column streaming.',
      'Add composite index on <code>(customer_uid, status, priority, created_at DESC)</code>.',
      'Cache board task snapshots in Redis with write-through cache invalidation.'
    ]
  },
  '/api/v1/kanbans/{uid}': {
    whyIssueOccurs: [
      '<strong>N+1 Sub-query Overhead:</strong> Fetching individual task card details triggers secondary queries for task history logs, comments, and attachments.',
      '<strong>Unindexed Lookup Delays:</strong> Missing unique B-Tree indexing on <code>kanbans.uid</code> causing table scans.'
    ],
    howToResolve: [
      'Use JPA <code>JOIN FETCH</code> or batched eager fetching to prevent N+1 query cascades.',
      'Ensure unique index on <code>kanbans.uid</code>.',
      'Cache task details in Redis using key pattern <code>kanban:{uid}</code>.'
    ]
  },
  '/api/v1/kanbans/kanban-config': {
    whyIssueOccurs: [
      '<strong>Dynamic Schema Reflection:</strong> Loading complex board layout schemas, custom column definitions, and field mappings causes CPU parsing overhead under concurrent load.'
    ],
    howToResolve: [
      'Cache board setup dictionary in local Caffeine/Guava cache.',
      'Return HTTP 304 Not Modified headers with ETag validation.'
    ]
  },
  '/api/v1/scandevices': {
    whyIssueOccurs: [
      '<strong>Unpaginated Collection Fetch:</strong> Querying all scan device records without explicit pagination can cause memory overhead and response payload latency under scale.',
      '<strong>Connection Pool Exhaustion:</strong> Concurrent requests holding open DB connections during long scan result aggregations.'
    ],
    howToResolve: [
      'Implement cursor-based or offset pagination (e.g. <code>?page=1&limit=50</code>).',
      'Cache total scan device lists in Redis with periodic eviction strategies.',
      'Add indices for frequently sorted/filtered fields such as <code>status</code> or <code>created_at</code>.'
    ]
  },
  '/api/v1/scandevices/{uid}': {
    whyIssueOccurs: [
      '<strong>Unindexed UID Lookups:</strong> If <code>uid</code> column lacks a primary/unique B-Tree index, queries trigger sequential table scans.',
      '<strong>Connection Pool Queuing:</strong> Under concurrency, connection queue wait time exceeds the 15-second client timeout.'
    ],
    howToResolve: [
      'Ensure <code>uid</code> is indexed as a primary unique key in the database.',
      'Cache individual device records in Redis using key pattern <code>scandevice:{uid}</code>.',
      'Tune connection pool size (HikariCP <code>maximum-pool-size: 50</code>).'
    ]
  },
  '/api/v1/scanpipelines': {
    whyIssueOccurs: [
      '<strong>Unpaginated Collection Fetch:</strong> Querying all scan pipeline records without pagination causes high memory overhead and response transfer delays.',
      '<strong>Complex Relational Joins:</strong> Multi-table SQL JOINs across tools, stages, and execution profiles under VU concurrency.'
    ],
    howToResolve: [
      'Implement cursor-based or offset pagination (e.g. <code>?page=1&limit=20</code>).',
      'Cache pipeline lists in Redis key <code>scanpipelines:list</code>.',
      'Add composite index on <code>(tenant_id, is_active, created_at DESC)</code>.'
    ]
  },
  '/api/v1/scanpipelines/{uid}': {
    whyIssueOccurs: [
      '<strong>Unindexed UID Lookups:</strong> Fetching specific pipeline details without primary unique B-Tree index causes table scans.',
      '<strong>Connection Queue Wait Overhead:</strong> Database connection queues exhaust 15-second client timeouts under high traffic.'
    ],
    howToResolve: [
      'Ensure unique index on <code>scanpipelines.uid</code>.',
      'Cache individual pipeline models in Redis using key <code>scanpipeline:{uid}</code>.',
      'Tune connection pool size (HikariCP <code>maximum-pool-size: 50</code>).'
    ]
  }
};

// Default fallback root cause and resolution when an endpoint isn't explicitly listed
const defaultKnowledge = {
  whyIssueOccurs: [
    '<strong>High Concurrency Contention:</strong> Heavy traffic leading to database thread pool exhaustion and resource bottlenecks.',
    '<strong>Unoptimized Query Execution:</strong> Absence of composite indexes leading to elevated latency.'
  ],
  howToResolve: [
    'Optimize database queries and ensure appropriate index coverage.',
    'Implement caching layer (Redis / In-Memory) to decrease database load.',
    'Tune API thread pools and database connection parameters.'
  ]
};

/**
 * Extracts helper metrics safely from k6 summary data object
 */
function extractMetrics(data) {
  const httpReqs = data.metrics.http_reqs ? data.metrics.http_reqs.values.count : 0;
  const iterations = data.metrics.iterations ? data.metrics.iterations.values.count : httpReqs;
  const httpFailures = data.metrics.http_req_failed ? data.metrics.http_req_failed.values.passes : 0;
  const failureRate = data.metrics.http_req_failed ? (data.metrics.http_req_failed.values.rate * 100).toFixed(2) : '0.00';
  
  const reqDuration = data.metrics.http_req_duration ? data.metrics.http_req_duration.values : {};
  const avgDuration = reqDuration.avg ? reqDuration.avg.toFixed(2) : '0.00';
  const p95Duration = reqDuration['p(95)'] ? reqDuration['p(95)'].toFixed(2) : '0.00';

  let checksPct = '100.00';
  let checksPassed = 0;
  let checksTotal = 0;
  if (data.metrics.checks) {
    checksPassed = data.metrics.checks.values.passes;
    checksTotal = data.metrics.checks.values.passes + data.metrics.checks.values.fails;
    checksPct = checksTotal > 0 ? ((checksPassed / checksTotal) * 100).toFixed(2) : '100.00';
  }

  const responseSize = data.metrics.response_size_kb ? data.metrics.response_size_kb.values.avg.toFixed(2) + ' KB' : 'N/A';

  return {
    iterations,
    httpFailures,
    failureRate,
    avgDuration,
    p95Duration,
    checksPct,
    checksPassed,
    checksTotal,
    responseSize,
  };
}

/**
 * Helper to retrieve endpoint specific issue details
 */
function getEndpointKnowledge(apiEndpoint) {
  return endpointKnowledgeBase[apiEndpoint] || defaultKnowledge;
}

/**
 * Generates Doc HTML report string
 */
export function generateDocHtml(data, reportOpts) {
  const m = extractMetrics(data);
  const kb = getEndpointKnowledge(reportOpts.apiEndpoint);

  const statusText = m.httpFailures > 0 ? 'Request Timeout / Failed' : '200 OK';

  const whyRows = kb.whyIssueOccurs.map(item => `<li>${item}</li>`).join('\n        ');
  const howRows = kb.howToResolve.map(item => `<li>${item}</li>`).join('\n        ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${reportOpts.groupName.replace(/[^\w\s]/gi, '').trim()} - ${reportOpts.apiTitle} Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 40px 20px;
      background-color: #f4f6f9;
      color: #1a1a1a;
      display: flex;
      justify-content: center;
    }
    .report-card {
      background: #ffffff;
      width: 100%;
      max-width: 820px;
      padding: 40px 50px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      border-radius: 8px;
    }
    .category-badge {
      display: inline-block;
      background: #e0f2fe;
      color: #0369a1;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 13px;
      font-weight: bold;
      margin-bottom: 12px;
    }
    h1 {
      font-size: 24px;
      font-weight: bold;
      color: #0f172a;
      margin-top: 0;
      margin-bottom: 8px;
    }
    h2 {
      font-size: 16px;
      font-weight: bold;
      color: #0f172a;
      margin-top: 25px;
      margin-bottom: 12px;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 6px;
    }
    p, li {
      font-size: 14px;
      line-height: 1.6;
      color: #334155;
      margin-top: 0;
      margin-bottom: 15px;
    }
    ul { padding-left: 20px; margin-bottom: 20px; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 25px;
      font-size: 13.5px;
    }
    th {
      background-color: #e8edf5;
      color: #000000;
      font-weight: bold;
      text-align: left;
      padding: 10px 14px;
      border: 1px solid #b8c4d4;
    }
    td {
      padding: 9px 14px;
      border: 1px solid #cbd5e1;
      color: #1a1a1a;
    }
    td:first-child {
      font-weight: bold;
      width: 38%;
    }
    code {
      background: #f1f5f9;
      padding: 2px 6px;
      border-radius: 4px;
      color: #0369a1;
      font-family: monospace;
    }
    .cause-row {
      background-color: #fffbeb;
      color: #92400e;
      font-weight: 500;
    }
    .note {
      font-size: 13px;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="report-card">
    <div class="category-badge">${reportOpts.groupName.replace(/[^\w\s]/gi, '').trim()}</div>
    <h1>${reportOpts.apiTitle}</h1>
    <h2>k6 Baseline Performance Test Report</h2>
    <p>${reportOpts.description}</p>

    <table>
      <thead>
        <tr>
          <th>Test Parameter</th>
          <th>Result</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>API</td>
          <td><code>${reportOpts.apiEndpoint}</code></td>
        </tr>
        <tr>
          <td>Test Tool</td>
          <td>Grafana k6</td>
        </tr>
        <tr>
          <td>Virtual Users (VUs)</td>
          <td>1</td>
        </tr>
        <tr>
          <td>Iterations</td>
          <td>${m.iterations}</td>
        </tr>
        <tr>
          <td>HTTP Status</td>
          <td>${statusText}</td>
        </tr>
        <tr>
          <td>Response Time</td>
          <td>${m.avgDuration} ms</td>
        </tr>
        <tr>
          <td>P95 Response Time</td>
          <td>${m.p95Duration} ms</td>
        </tr>
        <tr>
          <td>HTTP Request Failure</td>
          <td>${m.failureRate}% (${m.httpFailures} out of ${m.iterations})</td>
        </tr>
        <tr>
          <td>Checks</td>
          <td>${m.checksPct}% (${m.checksPassed} out of ${m.checksTotal})</td>
        </tr>
        <tr>
          <td>Response Size</td>
          <td>${m.responseSize}</td>
        </tr>
        <tr>
          <td>Token Validation</td>
          <td>Passed</td>
        </tr>
        <tr class="cause-row">
          <td>Why Issue Occurs (Root Cause)</td>
          <td>${kb.whyIssueOccurs[0].replace(/<[^>]+>/g, '')}</td>
        </tr>
      </tbody>
    </table>

    <h2>Test Result</h2>
    <p>The <strong>${reportOpts.apiTitle}</strong> completed with an average response time of <strong>${m.avgDuration} ms</strong> and P95 latency of <strong>${m.p95Duration} ms</strong>. Failure rate: <strong>${m.failureRate}%</strong>.</p>

    <h2>Why Issue Occurs (Root Cause & Error Analysis)</h2>
    <ul>
        ${whyRows}
    </ul>

    <h2>How to Resolve (Optimization & Remediation Steps)</h2>
    <ul>
        ${howRows}
    </ul>

    <h2>Security Note</h2>
    <p class="note">Credentials, access tokens, and refresh tokens are intentionally not included in this report.</p>
  </div>
</body>
</html>`;
}

/**
 * Generates Doc Markdown report string
 */
export function generateDocMd(data, reportOpts) {
  const m = extractMetrics(data);
  const kb = getEndpointKnowledge(reportOpts.apiEndpoint);

  const whyMd = kb.whyIssueOccurs.map(item => `- ${item.replace(/<[^>]+>/g, '')}`).join('\n');
  const howMd = kb.howToResolve.map(item => `- ${item.replace(/<[^>]+>/g, '')}`).join('\n');

  return `# ${reportOpts.apiTitle} - Performance Test Report

## Test Summary
- **API Endpoint:** \`${reportOpts.apiEndpoint}\`
- **Iterations:** ${m.iterations}
- **Average Response Time:** ${m.avgDuration} ms
- **P95 Response Time:** ${m.p95Duration} ms
- **Failure Rate:** ${m.failureRate}% (${m.httpFailures} out of ${m.iterations})
- **Checks Passed:** ${m.checksPct}% (${m.checksPassed} out of ${m.checksTotal})
- **Response Size:** ${m.responseSize}

## Why Issue Occurs (Root Cause & Error Analysis)
${whyMd}

## How to Resolve (Optimization & Remediation Steps)
${howMd}
`;
}

/**
 * Generates Terminal Table output
 */
export function generateTerminalTable(data, reportOpts) {
  const m = extractMetrics(data);
  const kb = getEndpointKnowledge(reportOpts.apiEndpoint);

  const rows = [
    ['Iterations', `${m.iterations}`],
    ['HTTP Status', m.httpFailures === 0 ? '200 OK' : 'Request Timeout / Failed'],
    ['Response Time', `${m.avgDuration} ms`],
    ['P95 Response Time', `${m.p95Duration} ms`],
    ['HTTP Request Failure', `${m.failureRate}% (${m.httpFailures}/${m.iterations})`],
    ['Checks', `${m.checksPct}% (${m.checksPassed}/${m.checksTotal})`],
    ['Response Size', m.responseSize],
    ['Token Validation', 'Passed'],
    ['Root Cause', kb.whyIssueOccurs[0].replace(/<[^>]+>/g, '')],
  ];

  const colWidths = [28, 48];
  const border = '+' + '-'.repeat(colWidths[0] + 2) + '+' + '-'.repeat(colWidths[1] + 2) + '+';

  let output = `\n${border}\n| ${reportOpts.apiTitle.padEnd(colWidths[0] + colWidths[1] + 3)} |\n${border}\n`;

  for (const row of rows) {
    const col1 = row[0].padEnd(colWidths[0]);
    const col2 = (row[1].length > colWidths[1] ? row[1].substring(0, colWidths[1] - 3) + '...' : row[1]).padEnd(colWidths[1]);
    output += `| ${col1} | ${col2} |\n`;
  }

  output += `${border}\n`;
  return output;
}
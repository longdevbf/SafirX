# Database Testing Guide

This guide covers the comprehensive database testing suite for the Oasis Market NFT marketplace project.

## 📋 Available Test Files

### 1. `test-database.js` - Basic Database Test
- **Purpose**: Tests basic database connection, table creation, and API endpoints
- **Features**:
  - Database connection validation
  - Table creation (collections, collection_items, collection_likes)
  - Index creation and triggers
  - Basic CRUD operations
  - API endpoint testing
  - Test data cleanup
- **Run**: `node test-database.js`

### 2. `test-collections-db.js` - Collections Database Test
- **Purpose**: Tests collections-specific database operations and functionality
- **Features**:
  - Collections table operations
  - Collection items management
  - Collection likes functionality
  - Specialized collection queries
- **Run**: `node test-collections-db.js`

### 3. `test-database-advanced.js` - Advanced Performance Test ⭐ **NEW**
- **Purpose**: Tests database performance, concurrency, and data validation
- **Features**:
  - **Bulk Insert Performance**: Tests inserting 100 mock collections
  - **Query Performance**: Tests various query types (SELECT, JOIN, aggregations)
  - **Concurrent Operations**: Tests 10 simultaneous database operations
  - **Data Validation**: Tests constraints (unique, NOT NULL)
  - **Transaction Performance**: Tests transactional inserts with rollback
  - **Index Performance**: Tests database index effectiveness
  - **Database Statistics**: Shows table stats and performance metrics
  - **Automatic Cleanup**: Removes all test data after completion
- **Run**: `node test-database-advanced.js`

### 4. `run-all-tests.js` - Comprehensive Test Runner ⭐ **NEW**
- **Purpose**: Runs all database tests with comprehensive reporting
- **Features**:
  - Prerequisite checking
  - Sequential test execution
  - Colored output and progress tracking
  - Detailed test summaries
  - Timeout management
  - Command-line options
- **Run**: `node run-all-tests.js`

## 🚀 Quick Start

### Run All Tests
```bash
node run-all-tests.js
```

### Run Specific Test
```bash
# Run only the advanced performance test
node run-all-tests.js --test "Advanced"

# Run only the basic test
node run-all-tests.js --test "Basic"
```

### List Available Tests
```bash
node run-all-tests.js --list
```

### Get Help
```bash
node run-all-tests.js --help
```

## 📊 Test Results Overview

The advanced test suite provides detailed metrics including:

- **Performance Metrics**: Timing for bulk operations, queries, and concurrent operations
- **Database Statistics**: Live rows, inserts, updates, deletes per table
- **Constraint Validation**: Verification of database constraints
- **Index Performance**: Testing of database index effectiveness
- **Error Handling**: Proper error detection and reporting

## 🔧 Prerequisites

Before running the tests, ensure you have:

1. **PostgreSQL Database**: Running and accessible
2. **Environment Variables**: `DATABASE_URL` properly configured
3. **Node.js Dependencies**: All required packages installed
   ```bash
   npm install
   ```
4. **Database Tables**: Created by running the basic test first

## 📈 Performance Benchmarks

The advanced test suite includes performance benchmarks for:

- **Bulk Inserts**: 100 collections with timing metrics
- **Query Performance**: Various query types with execution times
- **Concurrent Operations**: 10 simultaneous database operations
- **Transaction Performance**: Transactional inserts with rollback testing
- **Index Effectiveness**: Performance comparison with and without indexes

## 🛠️ Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check `DATABASE_URL` environment variable
   - Verify PostgreSQL is running
   - Ensure database credentials are correct

2. **Table Does Not Exist**
   - Run the basic test first: `node test-database.js`
   - This creates all necessary tables and indexes

3. **Permission Denied**
   - Make files executable: `chmod +x *.js`
   - Check database user permissions

4. **Timeout Errors**
   - Increase timeout: `node run-all-tests.js --timeout 90000`
   - Check database performance

### Environment Setup

```bash
# Example .env file
DATABASE_URL=postgresql://username:password@localhost:5432/database_name

# Make scripts executable
chmod +x test-database.js
chmod +x test-database-advanced.js
chmod +x run-all-tests.js
```

## 🎯 Test Coverage

The comprehensive test suite covers:

- ✅ **Connection Testing**: Database connectivity and authentication
- ✅ **Schema Testing**: Table creation, indexes, and constraints
- ✅ **CRUD Operations**: Create, read, update, delete operations
- ✅ **Performance Testing**: Bulk operations and query performance
- ✅ **Concurrency Testing**: Simultaneous database operations
- ✅ **Data Validation**: Constraint testing and error handling
- ✅ **Transaction Testing**: ACID compliance and rollback scenarios
- ✅ **Index Testing**: Index effectiveness and performance
- ✅ **Statistics Monitoring**: Database health and performance metrics

## 📝 Adding New Tests

To add a new test file:

1. Create your test file following the existing pattern
2. Add it to the `TEST_CONFIGS` array in `run-all-tests.js`
3. Include proper cleanup functionality
4. Add documentation to this guide

## 🤝 Contributing

When contributing to the test suite:

1. Follow the existing code style and patterns
2. Include comprehensive error handling
3. Add cleanup functionality for test data
4. Update this documentation
5. Test your changes thoroughly

## 📚 Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Node.js pg Library](https://node-postgres.com/)
- [Database Testing Best Practices](https://www.postgresql.org/docs/current/regress.html)

---

**Happy Testing! 🎉**
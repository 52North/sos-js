package SOS::Database; 

########################################################################################
# SOS::Database
#
# Function library containing all of the database handling functions.
# This includes connection and query handling
#
# TDBA 2013-05-01
########################################################################################
# GLOBAL DECLARATIONS
########################################################################################
use warnings;
use strict;
use SOS::Error;
use SOS::Messages;
use DBI;
use Exporter;
use Data::Dumper;
use DBI::Const::GetInfoType;

our (@ISA, @EXPORT);
@ISA = qw(Exporter);

@EXPORT = qw(&connect_to_db &disconnect_from_db &run_query &run_multiple_queries &commit_changes);
########################################################################################
# FUNCTIONS
########################################################################################
sub connect_to_db # Connects to SOS DB
{
    my ($db_hash) = @_;

    # Check the required elements are in the DB hash
    if (!defined(${$db_hash}{'type'})) { error(E_NODBELEMENT, __FILE__, __LINE__, "type"); }
    if (!defined(${$db_hash}{'host'})) { error(E_NODBELEMENT, __FILE__, __LINE__, "host"); }
    if (!defined(${$db_hash}{'name'})) { error(E_NODBELEMENT, __FILE__, __LINE__, "name"); }
    if (!defined(${$db_hash}{'user'})) { error(E_NODBELEMENT, __FILE__, __LINE__, "user"); }
    if (!defined(${$db_hash}{'pass'})) { error(E_NODBELEMENT, __FILE__, __LINE__, "pass"); }

    # Print message
    print_message(MSG_DBCONN, ${$db_hash}{'name'}, ${$db_hash}{'host'}, ${$db_hash}{'user'});

    # Create the data source name
    my $dsn = sprintf("dbi:%s:host=%s;dbname=%s", ${$db_hash}{'type'}, ${$db_hash}{'host'}, ${$db_hash}{'name'});

    # Connect to the database
    my $conn = DBI->connect($dsn, ${$db_hash}{'user'}, ${$db_hash}{'pass'}, {'RaiseError' => 0, 'PrintError' => 1, 'AutoCommit' => 0});

    # If we cannot connect, display an error
    if (!$conn) { error(E_CONNFAIL, __FILE__, __LINE__, ${$db_hash}{'name'}, ${$db_hash}{'host'}, ${$db_hash}{'user'}, $DBI::errstr); }

    # Return the handle
    return $conn;
}
########################################################################################
sub disconnect_from_db # Disconnects from SOS DB
{
    my ($conn) = @_;
    my $name = $conn->get_info($GetInfoType{'SQL_DATABASE_NAME'});
    my $user = $conn->get_info($GetInfoType{'SQL_USER_NAME'});

    # Commit any changes
    commit_changes($conn);

    # Print message
    print_message(MSG_DBDISCONN, $name, $user);

    $conn->disconnect or error(E_DISCONNFAIL, __FILE__, __LINE__, $DBI::errstr);
}
########################################################################################
sub run_query # Runs a DB query
{
    my $conn   = defined($_[0]) ? $_[0] : "";
    my $sql    = defined($_[1]) ? $_[1] : "";
    my $vars   = defined($_[2]) ? $_[2] : [];
    my $commit = defined($_[3]) ? $_[3] : 0;

    # Test if connection variable exists. Error if not
    if (!$conn) { error(E_NOTCONN, __FILE__, __LINE__); }

    # Parse the query or rollback and display error message 
    my $parse = $conn->prepare($sql);
    if (!$parse) { $conn->rollback(); error(E_PARSEFAIL, __FILE__, __LINE__, $sql, dump_bind_vars($vars)); }

    # Add bind variables
    for (my $i=1; $i<=scalar(@$vars); $i++) { $parse->bind_param($i, ${$vars}[$i - 1]); }

    # Execute query or rollback and display error message
    my $exec = $parse->execute();
    if (!$exec) { $conn->rollback(); error(E_EXECFAIL, __FILE__, __LINE__, $sql, dump_bind_vars($vars)); }

    # Commit if required or rollback and display error message
    if ($commit) { commit_changes($conn); }

    # Return the parse variable
    return $parse;
}
########################################################################################
sub run_multiple_queries # Runs queries in a single transaction, then commits. Use only for INSERT. UPDATE or DELETE queries
{
    my ($conn, $qref, $vref) = @_;
    if (!$conn) { error(E_NOTCONN, __FILE__, __LINE__); }

    for (my $i=0; $i<scalar(@$qref); $i++)
    {
        my ($this_query, $these_vars) = (${$qref}[$i], ${$vref}[$i]);
        run_query($this_query, $these_vars, 0);
    }

    my $commit = $conn->commit();
    if (!$commit)
    {
       $conn->rollback();
       error(E_COMMFAIL, __FILE__, __LINE__, $conn->errstr());
    }
}
########################################################################################
sub commit_changes # Commits changes to database, or rollsback on failure
{
    my ($conn) = @_;

    # Rollback if dry-run flag is set. Otherwise, commit
    if ((defined($SOS::Main::dry_run)) || ($SOS::Main::dry_run)) 
    { 
       print_message(MSG_DRYROLLBACK);
       $conn->rollback();
    }
    else
    {
       print_message(MSG_COMMIT);
       my $comm = $conn->commit();
       if (!$comm) { $conn->rollback(); error(E_COMMFAIL, __FILE__, __LINE__); }
    }
}
########################################################################################
sub dump_bind_vars
{
    my ($vars) = @_;

    my $dump_str = "";
    for (my $i=1; $i<=@$vars; $i++) { $dump_str .= "p$i: " . ${$vars}[$i - 1] . " "; }

    return $dump_str;
}
########################################################################################
# DOCUMENTATION
########################################################################################
END { }
1;

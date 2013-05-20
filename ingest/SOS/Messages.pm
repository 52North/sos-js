package SOS::Messages; 

########################################################################################
# SOS::Messages
#
# Function library containing all of the standard output messages
#
# TDBA 2013-05-01
########################################################################################
# GLOBAL DECLARATIONS
########################################################################################
use warnings;
use strict;
use POSIX qw(strftime);

use Exporter;

# Messages go here
use constant MSG_START       => "Starting insertion of '%s' data from site '%s' for offering '%s' at '%s'";
use constant MSG_DRYRUN      => "NOTE: DRY RUN SET. NO UPDATES TO DATABASE WILL TAKE PLACE";
use constant MSG_FORCESML    => "NOTE: FORCE-SML FLAG SET. SENSOR ML FILE WILL BE RECREATED";
use constant MSG_DBCONN      => "Connecting to SOS database '%s' on host '%s' with user '%s'";
use constant MSG_DBDISCONN   => "Disconnecting from SOS database '%s' with user '%s'";
use constant MSG_COMMIT      => "Committing changes to database";
use constant MSG_DRYROLLBACK => "Rolling back, due to dry-run flag being set";
use constant MSG_CHECKEXIST  => "Checking to see if phenomena, offering, feature of interest and procedure exists in DB";
use constant MSG_NONEW       => "No new phenomena, offering, feature of interest or procedure found";
use constant MSG_NEWITEM     => "A new %s '%s' was found!";
use constant MSG_CHECKLINKS  => "Checking for links between SOS DB tables";
use constant MSG_CHECKOBS    => "Checking if observation exists";
use constant MSG_OBSEXISTS   => "An observation already exists! Ending. . .";
use constant MSG_OBSQUERY    => "Running observation query";
use constant MSG_END         => "Completed insertion of '%s' data from site '%s' for offering '%s' at '%s'";
use constant MSG_NEWSML      => "Recreating sensor ML file '%s'";
use constant MSG_SMLCOMPLETE => "Completed recreation of sensor ML file '%s'";
#use constant MSG_CHECK       => "Checking '%s' exists in '%s' for host '%s'";
#use constant MSG_PARSECONFIG => "Parsing config file";
#use constant MSG_PARSEDATA   => "Parsing data string";
#use constant MSG_FINDINFO    => "Finding information for check '%s'";
#use constant MSG_FINDFOI     => "Finding feature of interest for host '%s'";
#use constant MSG_GETPROC     => "Getting proc file for feature of interest '%s'";
#use constant MSG_DBCONN      => "Connecting to SOS database '%s' on host '%s' with user '%s'";
#use constant MSG_CHECKEXIST  => "Checking to see if phenomena, offering, feature of interest and procedure exists in DB";
#use constant MSG_NONEW       => "No new phenomena, offering, feature of interest or procedure found";
#use constant MSG_NEWSENSOR   => "New items found. Recreating sensor XML file '%s'";
#use constant MSG_CHECKLINKS  => "Checking for links between SOS DB tables";
#use constant MSG_CHECKOBS    => "Checking if an observation exists for phenomena '%s' on host '%s' at time '%s'";
#use constant MSG_OBSEXISTS   => "An observation already exists for phenomena '%s' on host '%s' at time '%s'. Skipping. . .";
#use constant MSG_OBSQUERY    => "Creating query for observation for phenomena '%s' on host '%s' at time '%s'";
#use constant MSG_UPDATEDB    => "Updating database with new data";
#use constant MSG_DBDISCONN   => "Disconnecting from SOS database '%s'";

our (@ISA, @EXPORT);
@ISA = qw(Exporter);

@EXPORT = qw(&print_message &print_delimiter
             MSG_START MSG_DRYRUN MSG_FORCESML MSG_DBCONN MSG_DBDISCONN MSG_COMMIT MSG_DRYROLLBACK MSG_CHECKEXIST MSG_NONEW MSG_NEWITEM 
             MSG_CHECKLINKS MSG_CHECKOBS MSG_OBSEXISTS MSG_OBSQUERY MSG_END MSG_NEWSML MSG_SMLCOMPLETE
            );
#@EXPORT = qw(&print_message
#             MSG_START MSG_CHECK MSG_PARSECONFIG MSG_PARSEDATA MSG_FINDINFO MSG_FINDFOI MSG_GETPROC MSG_DBCONN MSG_CHECKEXIST MSG_NONEW MSG_NEWSENSOR
#             MSG_CHECKLINKS MSG_CHECKOBS MSG_OBSEXISTS MSG_OBSQUERY MSG_DRYRUN MSG_UPDATEDB MSG_DBDISCONN
#            );
########################################################################################
# FUNCTIONS
########################################################################################
sub print_message # Prints output message in standard format
{
    my ($msg, @vals) = @_;
    if ((!defined($SOS::Main::verbose)) || (!$SOS::Main::verbose)) { return; }

    printf("%s (%s) $msg\n", strftime("%Y-%m-%d %H:%M:%S", localtime()), $0, @vals);
}
########################################################################################
sub print_delimiter # Prints delimiter
{
    if ((!defined($SOS::Main::verbose)) || (!$SOS::Main::verbose)) { return; }
    print "##########################################################################\n";
}
########################################################################################
# DOCUMENTATION
########################################################################################

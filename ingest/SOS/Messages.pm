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
END { }
1;
########################################################################################
# DOCUMENTATION
########################################################################################

=head1 NAME

SOS::Messages - Function library containing verbose output messages. This module ensures the same messages are printed
in the same format throughout the entire set of modules.

=head1 SYNOPSIS

use SOS::Messages;

=head1 SUBROUTINES

=head2 print_message(I<message>, I<variables>)

Prints a message to standard output. A message will only be displayed if the B<$SOS::Main::verbose> variable is set to 1. 
I<message> can either be a formatted string, or one of the message constants shown in the the L</"CONSTANTS"> section below. 
I<variables> is an array of variables which will fill the placeholders in the message.

=head2 print_delimiter()

Prints a standard delimiter i.e. a line of hashes. If B<$SOS::Main::verbose> is undefined or set to 0, nothing will be
printed. 

=head1 CONSTANTS

Below is the list of constants and the output messages they produce if used:

 MSG_START       => "Starting insertion of '%s' data from site '%s' for offering '%s' at '%s'"
 MSG_DRYRUN      => "NOTE: DRY RUN SET. NO UPDATES TO DATABASE WILL TAKE PLACE"
 MSG_FORCESML    => "NOTE: FORCE-SML FLAG SET. SENSOR ML FILE WILL BE RECREATED"
 MSG_DBCONN      => "Connecting to SOS database '%s' on host '%s' with user '%s'"
 MSG_DBDISCONN   => "Disconnecting from SOS database '%s' with user '%s'"
 MSG_COMMIT      => "Committing changes to database"
 MSG_DRYROLLBACK => "Rolling back, due to dry-run flag being set"
 MSG_CHECKEXIST  => "Checking to see if phenomena, offering, feature of interest and procedure exists in DB"
 MSG_NONEW       => "No new phenomena, offering, feature of interest or procedure found"
 MSG_NEWITEM     => "A new %s '%s' was found!"
 MSG_CHECKLINKS  => "Checking for links between SOS DB tables"
 MSG_CHECKOBS    => "Checking if observation exists"
 MSG_OBSEXISTS   => "An observation already exists! Ending. . ."
 MSG_OBSQUERY    => "Running observation query"
 MSG_END         => "Completed insertion of '%s' data from site '%s' for offering '%s' at '%s'"
 MSG_NEWSML      => "Recreating sensor ML file '%s'"
 MSG_SMLCOMPLETE => "Completed recreation of sensor ML file '%s'"

=head1 AUTHOR

PSD Admin, E<lt>psdadmin@psddata.nerc-bas.ac.ukE<gt>

=head1 COPYRIGHT AND LICENSE

Copyright (C) 2013 by PSD Admin

This library is free software; you can redistribute it and/or modify
it under the same terms as Perl itself, either Perl version 5.8.6 or,
at your option, any later version of Perl 5 you may have available.

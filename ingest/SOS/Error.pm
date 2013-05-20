package SOS::Error; 

################################################################################
# SOS::Error
#
# Function library containing error and warning messages
#
# TDBA 2013-05-01
################################################################################
# GLOBAL DECLARATIONS
################################################################################
use warnings;
use strict;
use POSIX qw(strftime);

use Exporter;

# List of error codes
use constant E_NOHASH        =>  1; # Expected hash has not been found
use constant E_NOOBSELEMENT  =>  2; # No element in observation hash
use constant E_NODBELEMENT   =>  3; # No element in database hash
use constant E_NOFOIELEMENT  =>  4; # No element in feature of interest hash
use constant E_NOSENELEMENT  =>  5; # No element in sensor hash
use constant E_NOCONFELEMENT =>  6; # No element in config file
use constant E_IDFAIL        =>  7; # Cannot create ID
use constant E_NAMEFAIL      =>  8; # Cannot get name from ID
use constant E_NOSENSOR      =>  9; # No sensor hash found    
use constant E_UNSPECTEMP    => 10; # No template file specified
use constant E_NOCOLDELIM    => 11; # No column delimiter specified
use constant E_BADCOLTYPE    => 12; # Cannot determine column type 
use constant E_BADNUMBER     => 13; # Value is an invalid number 
use constant E_BADDATETIME   => 14; # Unable to determine date/time

# Database error codes (1xx)
use constant E_CONNFAIL    => 100; # Failed to connect to DB
use constant E_DISCONNFAIL => 101; # Failed to disconnect from DB
use constant E_NOTCONN     => 102; # Not connected to DB
use constant E_PARSEFAIL   => 103; # Error in parsing query
use constant E_EXECFAIL    => 104; # Error in executing query
use constant E_COMMFAIL    => 105; # Error in committing transaction

# File IO errors (2xx)
use constant E_NOFILE       => 200; # File not specified
use constant E_FILENOTEXIST => 201; # File does not exist
use constant E_NOFILEWRITE  => 202; # Cannot open file for writing
use constant E_NOFILEREAD   => 203; # Cannot open file for reading

our (@ISA, @EXPORT);
@ISA = qw(Exporter);

@EXPORT = qw(&error &warning
             E_NOHASH E_NOOBSELEMENT E_NODBELEMENT E_NOFOIELEMENT E_NOSENELEMENT E_NOCONFELEMENT E_IDFAIL E_NAMEFAIL E_NOSENSOR E_UNSPECTEMP 
             E_NOCOLDELIM E_BADCOLTYPE E_BADNUMBER E_BADDATETIME
             E_CONNFAIL E_DISCONNFAIL E_NOTCONN E_PARSEFAIL E_EXECFAIL E_COMMFAIL
             E_NOFILE E_FILENOTEXIST E_NOFILEWRITE E_NOFILEREAD
             );
########################################################################################
# FUNCTIONS
########################################################################################
sub error # Displays error message and quits script 
{
    my ($errnum, $file, $line, @e) = @_;

    my $msg   = get_message($errnum);
    my $error = sprintf("SOS ERROR %d: $msg ($file:$line)\n", $errnum, @e);

    print STDERR strftime("%Y-%m-%d %H:%M:%S", localtime(time())) . " ($0) $error";
    if ($SOS::Database::conn) { $SOS::Database::conn->disconnect }

    exit $errnum;
}
########################################################################################
sub warning # Displays warning message
{
    my ($errnum, $file, $line, @e) = @_;

    my $msg   = get_message($errnum);
    my $error = sprintf("SOS WARNING %d: $msg ($file:$line)\n", $errnum, @e);

    print STDERR strftime("%Y-%m-%d %H:%M:%S", localtime(time())) . " ($0) $error";
}
########################################################################################
sub get_message # Gets message and type from list
{
    my ($num, $type) = @_;

    # Create list of all messages
    my %emsg = (&E_NOHASH        => "No %s hash has been set!",
                &E_NOOBSELEMENT  => "Cannot find '%s' element in observation hash!",
                &E_NODBELEMENT   => "Cannot find '%s' element in database hash!",
                &E_NOFOIELEMENT  => "Cannot find '%s' element in feature of interest hash!",
                &E_NOSENELEMENT  => "Cannot find '%s' element in sensor hash!",
                &E_NOCONFELEMENT => "Cannot find '%s' element in config file '%s'!",
                &E_IDFAIL        => "Cannot create %s. %s not specified!",
                &E_NAMEFAIL      => "Cannot get %s. %s not specified!",
                &E_NOSENSOR      => "Cannot recreate sensorML file - no sensor hash found!",
                &E_UNSPECTEMP    => "No template file specifed!",        
                &E_NOCOLDELIM    => "No column delimiter found. Using ',' instead",
                &E_BADCOLTYPE    => "Cannot determine column type for '%s' (type is '%s')! Skipping. . .",
                &E_BADNUMBER     => "Expected a numeric value for '%s', but instead found '%s'. Skipping. . .",
                &E_BADDATETIME   => "Unable to determine date/time for '%s'!",

                &E_CONNFAIL     => "Cannot connect to SOS database '%s' on host '%s' with user '%s'! (%s)", 
                &E_DISCONNFAIL  => "Cannot disconnect from SOS database '%s'! (%s)",
                &E_NOTCONN      => "Not connected to database!",
                &E_PARSEFAIL    => "Error in parsing query! (SQL: %s)",
                &E_EXECFAIL     => "Error in executing query! (SQL: %s)",     
                &E_COMMFAIL     => "Error in committing transaction!",

                &E_NOFILE       => "No %s file specified!",
                &E_FILENOTEXIST => "%s file '%s' does not exist!",
                &E_NOFILEWRITE  => "Cannot open '%s' for writing!",
                &E_NOFILEWRITE  => "Cannot open '%s' for reading!"
               );

    # Get message
    my $msg = ($emsg{$num}) ? $emsg{$num} : "Unknown error";

    # Return message
    return $msg;
}
########################################################################################
END { }
1;
########################################################################################
# DOCUMENTATION
########################################################################################

=head1 NAME

SOS::Error - Function library containing the error and warning messages and subroutines. This
produces similar error/warning messages in similar formats across the entire set of modules and
scripts.

=head1 SYNOPSIS

use SOS::Error;

=head1 SUBROUTINES

=head2 error(I<error_number>, I<file>, I<line_number>, I<variables>)

Displays an error message, then quits. I<error_number> is usually referenced by a constant (e.g. E_CONNFAIL). This 
error number then refers to the message which is displayed. See the L</"CONSTANTS"> section for a list of which constant
matches which error message. I<file> is the file at which the error was called, which is usually referenced by the Perl 
constant B<__FILE__>. I<line_number> is the line number within I<file> where the error was called, usually referenced by
the Perl constant B<__LINE__>. I<variables> is an array of variables which will fill the placeholders in the message.

=head2 warning(I<error_number>, I<file>, I<line_number>, I<variables>)

Like B<error()> above, but displays a warning message and does not exit.  

=head1 CONSTANTS

Below is the list of constants and the error/warning messages they produce if used:

 E_NOHASH        = "No %s hash has been set!"
 E_NOOBSELEMENT  = "Cannot find '%s' element in observation hash!"
 E_NODBELEMENT   = "Cannot find '%s' element in database hash!"
 E_NOFOIELEMENT  = "Cannot find '%s' element in feature of interest hash!"
 E_NOSENELEMENT  = "Cannot find '%s' element in sensor hash!"
 E_NOCONFELEMENT = "Cannot find '%s' element in config file '%s'!"
 E_IDFAIL        = "Cannot create %s. %s not specified!"
 E_NAMEFAIL      = "Cannot get %s. %s not specified!"
 E_NOSENSOR      = "Cannot recreate sensorML file - no sensor hash found!"
 E_UNSPECTEMP    = "No template file specifed!"        
 E_NOCOLDELIM    = "No column delimiter found. Using ',' instead"
 E_BADCOLTYPE    = "Cannot determine column type for '%s' (type is '%s')! Skipping. . ."
 E_BADNUMBER     = "Expected a numeric value for '%s' but instead found '%s'. Skipping. . ."
 E_BADDATETIME   = "Unable to determine date/time for '%s'!"
 E_CONNFAIL      = "Cannot connect to SOS database '%s' on host '%s' with user '%s'! (%s)" 
 E_DISCONNFAIL   = "Cannot disconnect from SOS database '%s'! (%s)"
 E_NOTCONN       = "Not connected to database!"
 E_PARSEFAIL     = "Error in parsing query! (SQL: %s)"
 E_EXECFAIL      = "Error in executing query! (SQL: %s)"     
 E_COMMFAIL      = "Error in committing transaction!"
 E_NOFILE        = "No %s file specified!"
 E_FILENOTEXIST  = "%s file '%s' does not exist!"
 E_NOFILEWRITE   = "Cannot open '%s' for writing!"
 E_NOFILEWRITE   = "Cannot open '%s' for reading!"

=head1 AUTHOR

PSD Admin, E<lt>psdadmin@psddata.nerc-bas.ac.ukE<gt>

=head1 COPYRIGHT AND LICENSE

Copyright (C) 2013 by PSD Admin

This library is free software; you can redistribute it and/or modify
it under the same terms as Perl itself, either Perl version 5.8.6 or,
at your option, any later version of Perl 5 you may have available.

#!/usr/local/bin/perl -w

################################################################################
# obs_from_file.pl
#
# Simple script which will parse a flat file and update the SOS with the contents
#
# TDBA 2013-05-01
################################################################################
# GLOBAL DECLARATIONS
################################################################################
use warnings;
use strict;
use SOS::Main;
use SOS::Database;
use SOS::Messages;
use Getopt::Long;
use Data::Dumper;

# Initialise main variables
my $CONFIG_FILE     = "config.xml";     # Default config file to use
my $SITE            = "Halley";         # Default site name to use
my $FOI_LAT         = -75.583;          # Default latitude to use
my $FOI_LON         = -26.65;           # Default longitude to use
my $FOI_ELEV        = 33;               # Default elevation to use (in metres)

# Set up database connection constants
use constant DB_TYPE => "Pg";        # Database Interface
use constant DB_HOST => "pdcdev";    # Hostname of DB
use constant DB_NAME => "sosdbtest"; # Database name
use constant DB_USER => "psdadmin";  # Database user
use constant DB_PASS => "";          # Database password
################################################################################
# MAIN BODY
################################################################################

# Parse the command line arguments
my ($file, $conf, $force_sml, $dry_run, $verbose) = ("", $CONFIG_FILE, 0, 0, 0);
GetOptions("file|f=s" => \$file, "config|c=s" => \$conf, "force-sml|s" => \$force_sml, "dry-run|d" => \$dry_run, "verbose|v" => \$verbose);

# Set SOS::Main variables
$SOS::Main::force_sml = $force_sml;
$SOS::Main::dry_run   = $dry_run;
$SOS::Main::verbose   = $verbose;

# Connect to database and setup the database hash
my %conn_hash = ("type" => DB_TYPE, "host" => DB_HOST, "name" => DB_NAME, "user" => DB_USER, "pass" => DB_PASS);
my $conn      = connect_to_db(\%conn_hash);
my %db        = ("conn" => $conn);

# Create the site hash
my %site = ("name" => $SITE, "latitude" => $FOI_LAT, "longitude" => $FOI_LON, "elevation" => $FOI_ELEV); 

# Decode the file
decode_file($file, $conf, \%db, \%site, $dry_run, $verbose, $force_sml);

# Disconnect from database
disconnect_from_db($conn);

# Print delimiter
print_delimiter();
################################################################################
# DOCUMENTATION
################################################################################

=head1 NAME

obs_from_file - Simple script which will parse a flat file and update the SOS with the contents.

=head1 SYNOPSIS

B<obs_from_file.pl> B<--file>=I<data_file> [B<--config>=I<config_file>] [B<--verbose>] [B<--dry-run>] [B<--force-sml>]

=head1 DESCRIPTION

This script will take a flat file, parse it, and update the designated SOS database with the contents of the file. A config file is required which
contains all the necessary information about the format of the data file, as well as other important information. It is, in effect, a wrapper to 
the SOS::Main::decode_file() subroutine.

=head1 REQUIREMENTS

An XML config file is required. By default, the script searches for one called "config.xml" in the same directory as this script. Additionally, a
familiarity with SOS terminology will be useful.

=head1 OPTIONS

B<--file>=I<data_file> | B<-f> I<data_file>

Specifies the data file containing the data you wish to insert into SOS. Obviously, this is required!

B<--config>=I<config_file> | B<-c> I<config_file>

Specifies the XML config file to use, if it is different to the default config file (config.xml).

B<--verbose> | B<-v>

Prints verbose output.

B<--dry-run> | B<-d>

Runs the script as normal, producing the same output. However, it does not update the database. It will not create the sensor ML file either, unless 
the "force-sml" switch was set.

B<--force-sml> | B<-s>

This will force a recreation of the sensor ML file. 

=head1 CONFIG FILE

The config file contains all of the information about the individual data file and the data set as a whole. Below is a description 
of the tags which can be used in the config file:

B<E<lt>configE<gt>>

The configuration should be enclosed within B<E<lt>configE<gt>> tags.

B<E<lt>offeringE<gt>>

The content of the B<E<lt>offeringE<gt>> tag should be the name of the offering. The script will generate an offering ID based on the
offering name.

B<E<lt>procedureE<gt>>

The content of the B<E<lt>procedureE<gt>> tag should be the name of the procedure. The script will generate a procedure ID and procedure
file name based on the procedure name.

B<E<lt>templateE<gt>>

The content of the B<E<lt>templateE<gt>> tag should be a template file suitable for use with the HTML::Template module. If this tag is not 
present, the default template file will be used. This default template file can be found in the SOS modules directory, and is called 
"sensor.template".

B<E<lt>columnsE<gt>>

The content of the B<E<lt>columnsE<gt>> tag is a number of B<E<lt>columnE<gt>> tags; one for each column in the data file. Uses the following
attributes: 

* B<delimiter> (I<string>) - The delimiter used to separate columns in the data file. If not set, uses a comma.

B<E<lt>columnE<gt>>

The content of a B<E<lt>columnE<gt>> tag is the phenomenon description. The script will generate an phenomenon ID based on the phenomenon name.
The tag uses the following attributes:

* B<num> (I<integer>) - The sequential number of this column, starting with 0 for the left-most column. This is to ensure columns are always processed
in the correct order. This attribute is required.

* B<unit> (I<string>) - The unit of measure for this phenomenon. Most units of measure are taken from the Unified Code for Units of Measure, found at
http://unitsofmeasure.org.

* B<include> (I<boolean>) - Flag to determine whether or not to include this phenomenon in the SOS. If this attribute is not present, assumes false.

* B<type> ([B<numeric>|B<text>]) - Determines what kind of value can be found in this column. Only B<numeric> or B<text> are allowed values. This attribute
must be set if the B<include> attribute is set to 1.

* B<sensor> (I<string>) - The ID of the sensor from which this measurement is made. See the B<E<lt>sensorE<gt>> tag section for more information.

B<E<lt>sensorsE<gt>>

The content of the B<E<lt>sensorsE<gt>> tag is a number of B<E<lt>sensorE<gt>> tags.

B<E<lt>sensorE<gt>>

The content of a B<E<lt>sensorE<gt>> tag is a series of tags whose names are keywords for this sensor. The content of these tags is the value associated
with that keyword. The tag uses the following attributes:

* B<id> (I<string>) - The ID of this sensor. This ID can then be used in the B<sensor> attribute of a B<E<lt>columnE<gt>> tag.

=head1 SEE ALSO

For more information on how the individual subroutines work, should you need to use them, read the documentation for the SOS::Main module.

=head1 AUTHOR

PSD Admin, E<lt>psdadmin@psddata.nerc-bas.ac.ukE<gt>

=head1 COPYRIGHT AND LICENSE

Copyright (C) 2013 by PSD Admin

This library is free software; you can redistribute it and/or modify
it under the same terms as Perl itself, either Perl version 5.8.6 or,
at your option, any later version of Perl 5 you may have available.

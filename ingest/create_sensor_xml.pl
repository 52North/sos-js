#!/usr/local/bin/perl -w

################################################################################
# obs_from_file.pl
#
# Simple script which will recreate the sensor ML file
#
# TDBA 2013-05-20
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

# Set database connection constants
use constant DB_TYPE => "Pg";        # Database Interface
use constant DB_HOST => "pdcdev";    # Hostname of DB
use constant DB_NAME => "sosdbtest"; # Database name
use constant DB_USER => "psdadmin";  # Database user
use constant DB_PASS => "";          # Database password

# Initialise main variables
my $CONFIG_FILE = "config.xml"; # Default config file to use
################################################################################
# MAIN BODY
################################################################################

# Parse the command line arguments
my ($config_file, $verbose) = ($CONFIG_FILE, 0);
GetOptions("config|c=s" => \$config_file, "verbose|v" => \$verbose);

# Set SOS::Main variables
$SOS::Main::verbose = $verbose;

# Parse the config file
my %config = parse_config_file($config_file);

# Connect to the SOS database
my %conn_hash = ("type" => DB_TYPE, "host" => DB_HOST, "name" => DB_NAME, "user" => DB_USER, "pass" => DB_PASS);
my $conn      = connect_to_db(\%conn_hash);

# Create sensor information hash
my %sensor = ("template"       => $config{'sensor_template'},
              "sensor_file"    => sprintf("%s.xml", $config{'procedure'}),
              "sensor_id"      => procedure_id($config{'procedure'}),
              "site"           => $config{'site'},
              "components"     => $config{'sensors'});

# Update the sensor ML file
create_sensor_xml($conn, \%sensor);

# Disconnect from SOS database
disconnect_from_db($conn);

# Print delimiter
print_delimiter();
################################################################################
# DOCUMENTATION
################################################################################

=head1 NAME

create_sensor_xml.pl - Recreates a sensor ML file from a given config file.

=head1 SYNOPSIS

B<create_sensor_xml.pl> B<--config>=I<config_file> [B<--verbose>]

=head1 DESCRIPTION

This script will take a configuration file, containing information about a dataset, parses it and recreate the associated sensor ML file.
Essentially, it acts as a wrapper to the SOS::Main::create_sensor_xml() subroutine.

=head1 REQUIREMENTS

An XML config file is required. By default, the script searches for one called "config.xml" in the same directory as this script.

=head1 OPTIONS

B<--config>=I<config_file> | B<-c> I<config_file>

Specifies the XML config file to use, if it is different to the default config file (config.xml).

B<--verbose> | B<-v>

Prints verbose output.

=head1 SEE ALSO

See also the man pages for the SOS modules.

=head1 AUTHOR

PSD Admin, E<lt>psdadmin@psddata.nerc-bas.ac.ukE<gt>

=head1 COPYRIGHT AND LICENSE

Copyright (C) 2013 by PSD Admin

This library is free software; you can redistribute it and/or modify
it under the same terms as Perl itself, either Perl version 5.8.6 or,
at your option, any later version of Perl 5 you may have available.

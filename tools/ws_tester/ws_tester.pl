#!/usr/bin/perl -w

###############################################################################
# Project: BAS MetDB/SOS
# Purpose: Simple script to run queries against a web service
# Author:  Paul M. Breen, British Antarctic Survey
# Date:    2012-12-04
# Id:      $Id$
###############################################################################

use strict;
use Getopt::Long qw(:config no_ignore_case auto_help auto_version bundling);
use LWP::UserAgent;

###############################################################################
# Defines
###############################################################################
my $PROGNAME = "$0"; $PROGNAME =~ s#^.*/##;
my ($MAJOR, $MINOR, $REVISION) = (0, 1, '$Rev$');
our $VERSION = "${MAJOR}.${MINOR} (Revision ${REVISION})";

# Array of command line option specifiers (see Getopt::Long (3))
my @OPTS_MAP = (
'verbose|v:+',
);

my %OPTS_DEFAULTS = (
'verbose' => 0,
);

###############################################################################
# Main function
###############################################################################

my %opts = %OPTS_DEFAULTS;
my $retval = -1;

# Parse the given command line (in @ARGV)
GetOptions(\%opts, @OPTS_MAP);

# Ensure we have at least the mandatory arguments
die usage() if(scalar(@ARGV) < 2);

# Run the test query
$retval = ws_tester_main(\%opts, \@ARGV);

exit $retval;



###############################################################################
# Functions
###############################################################################

###############################################################################
# Function to return the program's usage message
#
# Pre-condition:  The function is called
# Post-condition: The program's usage message is returned as a string
###############################################################################
sub usage
{
  return `"$0" --help`;
}



###############################################################################
# Function to encapsulate the program's main routine
#
# Pre-condition:  References to the options hash & ARGV array are passed to
#                 the function.  The ARGV array must contain a valid URL and
#                 query file
# Post-condition: The program connects to the web service identified by the
#                 given URL, reads the query data from the given file,
#                 performs the request, then prints the response to stdout.
#                 Returns non-zero on failure, or returns zero on success
###############################################################################
sub ws_tester_main
{
  my($opts, $ARGV) = @_;
  my $url = $$ARGV[0];
  my $file = $$ARGV[1];
  my $content;
  my $retval = -1;

  print "$PROGNAME: Connecting to $url\n" if($$opts{'verbose'} > 0);

  # Setup the user agent
  my $ua = LWP::UserAgent->new;
  $ua->agent($PROGNAME);

  # Construct the request
  {
    open(IN, $file) or die "$PROGNAME: ERROR: Failed to open file $file for reading\n";
    local $/;
    $content = <IN>;
    close(IN);
  }
  print "$PROGNAME: Request content: $content\n" if($$opts{'verbose'} > 1);
 
  my $req = HTTP::Request->new(POST => $url);
  $req->content($content);

  # Pass request to the user agent and get a response back
  my $res = $ua->request($req);

  # Inform the user of the success
  if($res->is_success())
  {
    print "$PROGNAME: Request contained in $file successfully sent to $url\n" if($$opts{'verbose'} > 0);
    print $res->content, "\n";
    $retval = 0;
  }
  else
  {
    warn "$PROGNAME: ERROR: Failed to send request contained in $file to $url\n";
    $retval = -1;
  }

  return $retval;
}

__END__                           # End program, begin documentation

=head1 NAME

ws_tester.pl - Perl script for talking to a web service

=head1 SYNOPSIS

B<ws_tester.pl> [options] URL file

Where options are:

 --verbose[=level], -v [level] (incremental)
 --help
 --version

See perldoc ws_tester.pl for details.

=head1 DESCRIPTION

B<Ws_tester.pl> is a perl script for talking to a given web service, with the query request content contained in the given file.  The query is read from the file, sent to the web service at URL, and the response is then written to stdout.

=head1 OPTIONS

B<--help>, B<-?>

Print a short usage message and then quit.

B<--version>

Print the program's version message and then quit.

B<--verbose>[=I<level>], B<-v> [I<level>] (incremental)

Turn verbose (debug) messaging on.  The effects of this option are incremental.  Optionally, an explicit level of verbosity can be set.

=head1 SEE ALSO

See the LWP::UserAgent (3pm) documentation.

=head1 AUTHOR

PSD Admin, E<lt>psdadmin@psddata.nerc-bas.ac.ukE<gt>

=head1 COPYRIGHT AND LICENSE

Copyright (C) 2012 by PSD Admin

This program is free software; you can redistribute it and/or modify
it under the same terms as Perl itself, either Perl version 5.8.6 or,
at your option, any later version of Perl 5 you may have available.

=cut


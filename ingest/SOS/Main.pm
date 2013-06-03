package SOS::Main; 

########################################################################################
# SOS::Main
#
# Function library containing all of the core SOS functions.
# This is the only library you will need to include in a script which updates an SOS database
#
# TDBA 2013-05-01
########################################################################################
# GLOBAL DECLARATIONS
########################################################################################
use warnings;
use strict;
use SOS::Database;
use SOS::Error;
use SOS::Messages;
use XML::Simple;
use HTML::Template;
use File::Basename;
use POSIX qw(strftime);
use Exporter;
use Data::Dumper;

# SOS constants
use constant PHENOM_ROOT => "urn:ogc:def:phenomenon:OGC:1.0.30";   # Root of phenomenon ID
use constant PROC_ROOT   => "urn:ogc:object:feature:Sensor:BAS";   # Root of procedure ID
use constant FOI_PROJ    => 4326;                                  # EPSG projection used for feature of interest
use constant FOI_TYPE    => "sa:SamplingPoint";                    # The "feature_type" in the feature_of_interest table
use constant FOI_SCHEMA  => "http://xyz.org/reference-url2.html";  # The "schema_link" in the feature_of_interest table
use constant PROC_DIR    => "standard";                            # Directory containing the proc file on the SOS server
use constant PROC_TYPE   => "text/xml;subtype=\"SensorML/1.0.1\""; # The "description_type" in the procedure table
use constant SENSOR_ROOT => "urn:ogc:object:feature:Sensor";       # Root of sensor ID

# Other constants
use constant DEFAULT_COL_DELIM => ","; # Default column delimiter
use constant SENSOR_TEMPLATE   => "SOS/sensor.template"; # Default sensor template file

our (@ISA, @EXPORT);
@ISA    = qw(Exporter);
@EXPORT = qw(&decode_file &update_sos &create_sensor_xml &parse_config_file
             &phenomenon_id &procedure_id
             $verbose $dry_run $force_sml $no_insert $no_sml $conn);

our $verbose   = 0;
our $dry_run   = 0;
our $force_sml = 0;
our $no_insert = 0;
our $no_sml    = 0;
our $conn;
########################################################################################
# SUBROUTINES
########################################################################################
sub update_sos # Updates the SOS DB with content from a passed hash
{
    # Get passed arguments
    my %data    = (defined($_[0])) ? %{$_[0]} : ();
    my %sensor  = (defined($_[1])) ? %{$_[1]} : ();

    # Get the dry run and verbose variables from the hash. If they don't exist, set them to 0
    $verbose   = (defined($verbose))   ? $verbose   : (defined($data{'verbose'})   ? $data{'verbose'}   : 0);
    $dry_run   = (defined($dry_run))   ? $dry_run   : (defined($data{'dry_run'})   ? $data{'dry_run'}   : 0);
    $force_sml = (defined($force_sml)) ? $force_sml : (defined($data{'force_sml'}) ? $data{'force_sml'} : 0);
    $no_insert = (defined($no_insert)) ? $no_insert : (defined($data{'no_insert'}) ? $data{'no_insert'} : 0);   
    $no_sml    = (defined($no_sml))    ? $no_sml    : (defined($data{'no_sml'})    ? $data{'no_sml'}    : 0);   

    # If we are not doing inserts, then end the subroutine now
    if ($no_insert)
    {
       print_message(MSG_NOINSERT);
       return;
    }

    # Check the required data hash elements are set
    if (!defined($data{'db'}))                                                 { error(E_NOOBSELEMENT, __FILE__, __LINE__, "db");                  }
    if ((!defined($data{'procedure'}))  && (!defined($data{'procedure_id'})))  { error(E_NOOBSELEMENT, __FILE__, __LINE__, "procedure");           }
    if ((!defined($data{'offering'}))   && (!defined($data{'offering_id'})))   { error(E_NOOBSELEMENT, __FILE__, __LINE__, "offering");            }
    if (!defined($data{'foi'}))                                                { error(E_NOOBSELEMENT, __FILE__, __LINE__, "feature of interest"); }
    if ((!defined($data{'phenomenon'})) && (!defined($data{'phenomenon_id'}))) { error(E_NOOBSELEMENT, __FILE__, __LINE__, "phenomenon");          }
    if ((!defined($data{'time_stamp'})) && (!defined($data{'obs_time'})))      { error(E_NOOBSELEMENT, __FILE__, __LINE__, "time stamp");          }
    if (!defined($data{'unit'}))                                               { error(E_NOOBSELEMENT, __FILE__, __LINE__, "unit");                }
    if (!defined($data{'value_type'}))                                         { error(E_NOOBSELEMENT, __FILE__, __LINE__, "value type");          }
    if (!defined($data{'value_col'}))                                          { error(E_NOOBSELEMENT, __FILE__, __LINE__, "value column");        }
    if (!defined($data{'value'}))                                              { error(E_NOOBSELEMENT, __FILE__, __LINE__, "value");               }

    # Add any inferred values to the data hash (i.e. IDs if they aren't present)
    if (!defined($data{'procedure'}))        { $data{'procedure'}        = get_name_from_id($data{'procedure_id'});                    }
    if (!defined($data{'procedure_id'}))     { $data{'procedure_id'}     = procedure_id($data{'procedure'});                           }
    if (!defined($data{'procedure_file'}))   { $data{'procedure_file'}   = sprintf("%s.xml", $data{'procedure'});                      }    
    if (!defined($data{'offering'}))         { $data{'offering'}         = $data{'offering_id'};                                       }
    if (!defined($data{'offering_id'}))      { $data{'offering_id'}      = $data{'offering'};                                          }
    if (!defined($data{'phenomenon'}))       { $data{'phenomenon'}       = get_name_from_id($data{'phenomenon_id'});                   }
    if (!defined($data{'phenomenon_id'}))    { $data{'phenomenon_id'}    = phenomenon_id($data{'phenomenon'});                         }
    if (!defined($data{'foi'}{'name'}))      { $data{'foi'}{'name'}      = $data{'foi'}{'id'};                                         }
    if (!defined($data{'foi'}{'id'}))        { $data{'foi'}{'id'}        = $data{'foi'}{'name'};                                       }
    if (!defined($data{'foi'}{'elevation'})) { $data{'foi'}{'elevation'} = 0;                                                          }
    if (!defined($data{'obs_time'}))         { $data{'obs_time'}         = strftime("%Y-%m-%d %H:%M:%S", gmtime($data{'time_stamp'})); }

    # Add information to sensor hash
    if (!defined($sensor{'procedure_file'})) { $sensor{'procedure_file'} = $data{'procedure_file'}; }

    # Print introductory messages
    print_message(MSG_START, $data{'phenomenon'}, $data{'foi'}{'id'}, $data{'offering_id'}, $data{'obs_time'});
    if ($dry_run)   { print_message(MSG_DRYRUN);   }
    if ($force_sml) { print_message(MSG_FORCESML); }
    if ($no_sml)    { print_message(MSG_NOSML);    }
    if (($force_sml) && ($no_sml)) 
    {
       warning(E_FLAGCLASH, __FILE__, __LINE__);
       $force_sml = 0;
       $no_sml    = 0;
    }

    # Create query and var arrays
    my $queries = {};
    ${$queries}{'queries'} = [];
    ${$queries}{'vars'}    = [];

    # Connect to the SOS database, if not already connected
    my $connected_here = 0;
    if (!defined($data{'db'}{'conn'})) 
    {
       $data{'db'}{'conn'} = connect_to_db($data{'db'});
       $connected_here = 1;
    }
    $conn = $data{'db'}{'conn'};

    # Check if an observation exists. If so, exit subroutine, since we do not need to insert anything
    print_message(MSG_CHECKOBS);
    if (obs_exist(%data)) 
    {
       print_message(MSG_OBSEXISTS);
       if ($force_sml)      { recreate_sensorML(\%data, \%sensor); }
       if ($connected_here) { disconnect_from_db($data{'db'}, 1);  } 
       print_delimiter();
       return; 
    }  
 
    # Add the phenomena, offering, feature of interest and procedure if they do not exist in the database
    print_message(MSG_CHECKEXIST);
    my $new_phen = add_phenomenon(\%data);
    my $new_off  = add_offering(\%data);
    my $new_foi  = add_foi(\%data);
    my $new_proc = add_procedure(\%data);

    # Check the links between tables in SOS DB
    print_message(MSG_CHECKLINKS);
    check_links(\%data);

    # Recreate sensor ML, if required
    if (($new_phen) || ($new_off) || ($new_foi) || ($new_proc)) { recreate_sensorML(\%data, \%sensor); } 

    # Create the observation SQL. Then add them to the array
    print_message(MSG_OBSQUERY);
    add_observation(\%data);

    # Disconnect from the SOS database, if we connected in this subroutine
    if ($connected_here) { disconnect_from_db($data{'db'}{'conn'}, 1); }

    # Print delimiter
    print_message(MSG_END, $data{'phenomenon'}, $data{'foi'}{'id'}, $data{'offering_id'}, $data{'obs_time'});
    print_delimiter();
}
########################################################################################
sub decode_file # Goes through a file and creates an observation and sensor hash for each file record
{
    # Get passed variables
    my $data_file = (defined($_[0])) ? $_[0] : "";
    my $conf_file = (defined($_[1])) ? $_[1] : "";
    my $db_hash   = (defined($_[2])) ? $_[2] : {};
       $dry_run   = (defined($_[3])) ? $_[3] : 0;
       $verbose   = (defined($_[4])) ? $_[4] : 0;
       $force_sml = (defined($_[5])) ? $_[5] : 0;

    # Check if data files exist
    my @file_list = glob($data_file);
    if (!$data_file) { error(E_NOFILE, __FILE__, __LINE__, "Data"); } 
    if ((scalar(@file_list) == 0)) { error(E_FILENOTEXIST, __FILE__, __LINE__, "Data", $data_file); }

#    if (!$data_file)                              { error(E_NOFILE,       __FILE__, __LINE__, "Data");             }
#    if ((! -e $data_file) && ($data_file ne "-")) { error(E_FILENOTEXIST, __FILE__, __LINE__, "Data", $data_file); } 

    # Check if config file exists/
    if (!$conf_file)     { error(E_NOFILE, __FILE__, __LINE__, "Config");                   }
    if (! -e $conf_file) { error(E_FILENOTEXIST, __FILE__, __LINE__, "Config", $conf_file); } 

    # Parse the config file
    my %config = parse_config_file($conf_file);

    # If the database and site information was passed in the config file, use those instead of anything 
    # passed into the function call
    my $site_hash = {};
    if (defined($config{'database'})) { $db_hash   = $config{'database'}; }
    if (defined($config{'site'}))     { $site_hash = $config{'site'};     }

    # If database hash is still empty, we don't know what database to connect to, so error and quit
    # Also, if the site hash is still empty, we don't know what feature of interest this data is applicable to, so error and quit
    if (!%$db_hash)   { error(E_NOHASH, __FILE__, __LINE__, "database"); }
    if (!%$site_hash) { error(E_NOHASH, __FILE__, __LINE__,     "site"); }

    # Check a column delimiter exists. Warn and use a comma if it doesn't.
    if (!defined($config{'col_delimiter'}))
    {  
       warning(E_NOCOLDELIM, __FILE__, __LINE__, DEFAULT_COL_DELIM);
       $config{'col_delimiter'} = DEFAULT_COL_DELIM;
    }

    # Create the sensor hash
    my %sensor_hash = ();
    $sensor_hash{'template'}   = $config{'sensor_template'};
    $sensor_hash{'site'}       = $site_hash;
    $sensor_hash{'components'} = $config{'sensors'};
   
    # If we do not want to do any insert queries at all, just regenerate the sensor ML file if required, then return
    if ($no_insert)
    {
       print_message(MSG_NOINSERT);
       if ((defined($SOS::Main::force_sml)) && ($SOS::Main::force_sml)) 
       { 
          print_message(MSG_FORCESML);
          $sensor_hash{'sensor_file'} = sprintf("%s.xml", $config{'procedure'});
          $sensor_hash{'sensor_id'}   = procedure_id($config{'procedure'});
          create_sensor_xml(${$db_hash}{'conn'}, \%sensor_hash); 
       }
       return;
    }

    # Loop through the data files and process them
    foreach my $this_file (@file_list)
    {
       # Open the data file for reading
       open(FILE, $this_file) or error(E_NOFILEREAD, __FILE__, __LINE__, $this_file);
       
       # Loop through the contents of the data file and insert information into SOS
       while (my $line = <FILE>)
       {
          chomp $line;
   
          # Split the line up
          my @lineparts = split($config{'col_delimiter'}, $line);
   
          # Initialise date hash and observation array
          my %datetime     = ();
          my @observations = ();
   
          # Loop through the line parts and find the information we need
          for (my $i=0; $i<scalar(@lineparts); $i++)
          {
              # Get information on this particular column
              my $this_col  = $config{'columns'}[$i];
              my $this_val  = $lineparts[$i];
              my $this_name = ${$this_col}{'name'};
              my $this_type = ${$this_col}{'type'};
              my $this_unit = ${$this_col}{'unit'};
   
              # If we do not need to include this column, ignore it
              if (!${$this_col}{'include'}) { next; }
   
              # If this column is date/time related, obtain the information
              if ($this_name eq "observation_time") { $datetime{'obs_time'}  = $this_val; next; }
              if ($this_name eq        "timestamp") { $datetime{'timestamp'} = $this_val; next; } 
              if ($this_name eq             "year") { $datetime{'year'}      = $this_val; next; } 
              if ($this_name eq            "month") { $datetime{'month'}     = $this_val; next; } 
              if ($this_name eq         "monthday") { $datetime{'monthday'}  = $this_val; next; } 
              if ($this_name eq          "yearday") { $datetime{'yearday'}   = $this_val; next; } 
              if ($this_name eq             "hour") { $datetime{'hour'}      = $this_val; next; } 
              if ($this_name eq           "minute") { $datetime{'minute'}    = $this_val; next; } 
              if ($this_name eq           "second") { $datetime{'second'}    = $this_val; next; } 
   
              # Determine which type of column this is
              my ($value_col, $value_type) = ("", "");
              if    ($this_type eq "numeric") { $value_col = "numeric_value"; $value_type = "numericType"; } 
              elsif ($this_type eq    "text") { $value_col =    "text_value"; $value_type = "textType";    }
              else  { warning(E_BADCOLTYPE, __FILE__, __LINE__, $this_name, $this_type); next; } 
   
              # If we are expecting a numeric value, but we get a text value, skip this observation
              if (($this_type eq "numeric") && ($this_val !~ m/^(\-?)(\d*)(\.?)(\d*)$/)) 
              { 
                 warning(E_BADNUMBER, __FILE__, __LINE__, $this_name, $this_val);
                 next;
              }
   
              # Create the observation hash
              my %obs_hash = ();
              $obs_hash{'db'}         = $db_hash;
              $obs_hash{'procedure'}  = $config{'procedure'};
              $obs_hash{'offering'}   = $config{'offering'};
              $obs_hash{'foi'}        = $site_hash;
              $obs_hash{'phenomenon'} = $this_name;
              $obs_hash{'unit'}       = $this_unit;
              $obs_hash{'value_type'} = $value_type;
              $obs_hash{'value_col'}  = $value_col; 
              $obs_hash{'value'}      = $this_val;
              $obs_hash{'verbose'}    = $verbose;
              $obs_hash{'dry_run'}    = $dry_run;
              $obs_hash{'force_sml'}  = $force_sml;
   
              # Add observation to the observations array
              push(@observations, \%obs_hash);
          }
   
          # Determine the observation time from the datetime hash components
          my ($obs_time, $time_stamp) = ("-1", -1);
          if    (defined($datetime{'obs_time'}))  { $obs_time   = $datetime{'obs_time'};  }
          elsif (defined($datetime{'timestamp'})) { $time_stamp = $datetime{'timestamp'}; }
          else
          {
             my $y = (defined($datetime{'year'}))     ? $datetime{'year'} - 1900 : 0;
             my $m = (defined($datetime{'month'}))    ? $datetime{'month'} - 1   : 0;
             my $d = (defined($datetime{'monthday'})) ? $datetime{'monthday'}    : 0;
             my $h = (defined($datetime{'hour'}))     ? $datetime{'hour'}        : 0;
             my $i = (defined($datetime{'minute'}))   ? $datetime{'minute'}      : 0;
             my $s = (defined($datetime{'second'}))   ? $datetime{'second'}      : 0;
             my $j = (defined($datetime{'yearday'}))  ? $datetime{'yearday'} - 1 : -1;
   
             $time_stamp = strftime("%s", $s, $i, $h, $d, $m, $y, -1, $j);
          }
   
          # Add the date/time information to each observation, then insert the observation
          foreach my $this_obs (@observations)
          {
             if ($obs_time ne "-1")
             { 
                $obs_time =~ s/\"//g;
                ${$this_obs}{'obs_time'} = $obs_time; 
             }
             elsif ($time_stamp ne -1) { ${$this_obs}{'time_stamp'} = $time_stamp; }
             else { error(E_BADDATETIME, __FILE__, __LINE__, ${$this_obs}{'phenomenon'}); }
   
             update_sos($this_obs, \%sensor_hash);
          }
       }
           
       # Close the data file
       close(FILE);
    }
}
########################################################################################
sub parse_config_file
{      
    my ($config_file) = @_;
    my %config = ();
       
    # Read in the config file
    my $xml = XMLin($config_file, ForceArray => 1);
    
    # Get the column and sensor list, and the DB and site info, if present
    my $column_list = ${$xml}{'columns'}[0]{'column'};
    my $sensor_list = ${$xml}{'sensors'}[0]{'sensor'};
    my $db_info     = ${$xml}{'database'}[0];
    my $site_info   = ${$xml}{'site'}[0];

    # Get the column delimiter, or use the default
    $config{'col_delimiter'} = (defined(${$xml}{'columns'}[0]{'delimiter'})) ? ${$xml}{'columns'}[0]{'delimiter'} : DEFAULT_COL_DELIM;

    # Get the offering and the procedure. If they are missing, error and quit
    if (defined(${$xml}{'offering'}[0])) { $config{'offering'} = ${$xml}{'offering'}[0]; }
    else { error(E_NOCONFELEMENT, __FILE__, __LINE__, "offering", $config_file); }
    if (defined(${$xml}{'procedure'}[0])) { $config{'procedure'} = ${$xml}{'procedure'}[0]; }
    else { error(E_NOCONFELEMENT, __FILE__, __LINE__, "procedure", $config_file); }

    # Get the sensor ML template file, or use the default
    $config{'sensor_template'} = (defined(${$xml}{'template'}[0])) ? ${$xml}{'template'}[0] : SENSOR_TEMPLATE;

    # Go through the column list
    my @columns     = ();
    my %sensor_phen = ();
    foreach my $col_element (@$column_list)
    {
       my %this_col = ();
       my $num      = ${$col_element}{'num'};

       if (!${$col_element}{'content'}) { warn(sprintf("WARNING: Column %d in '%s' has no name! Skipping. . .", $num, $config_file)); }

       $this_col{'name'} = ${$col_element}{'content'};
       if (${$col_element}{'unit'})    { $this_col{'unit'}    =    ${$col_element}{'unit'}; }
       if (${$col_element}{'include'}) { $this_col{'include'} = ${$col_element}{'include'}; }
       if (${$col_element}{'type'})    { $this_col{'type'}    =    ${$col_element}{'type'}; }
       if (${$col_element}{'sensor'})
       {
          my $this_sensor = ${$col_element}{'sensor'};
          if (!defined($sensor_phen{$this_sensor})) { $sensor_phen{$this_sensor} = []; }
          push(@{$sensor_phen{$this_sensor}}, $this_col{'name'});
       }

       $columns[$num] = \%this_col;
    }
    $config{'columns'} = \@columns;

    # Go through the sensor list
    my %sensors = ();
    while (my($sensor_id, $sensor_hash) = each(%$sensor_list))
    {
       my %this_sen = ();
       $this_sen{'keyword'} = ();
       while (my($attribute, $value) = each(%$sensor_hash))
       {
          $this_sen{'keyword'}{$attribute} = ${$value}[0];
       }
       $sensors{$sensor_id} = \%this_sen;
       $sensors{$sensor_id}{'phenomena'} = $sensor_phen{$sensor_id};
    }
    $config{'sensors'} = \%sensors;

    # Get the database connection information, if present
    if ($db_info)
    {
       my %this_db = ();
       
       if (defined(${$db_info}{'type'})) { $this_db{'type'} = ${$db_info}{'type'}[0]; }
       if (defined(${$db_info}{'host'})) { $this_db{'host'} = ${$db_info}{'host'}[0]; }
       if (defined(${$db_info}{'name'})) { $this_db{'name'} = ${$db_info}{'name'}[0]; }
       if (defined(${$db_info}{'user'})) { $this_db{'user'} = ${$db_info}{'user'}[0]; }
       if (defined(${$db_info}{'pass'})) { $this_db{'pass'} = ${$db_info}{'pass'}[0]; }

       $config{'database'} = \%this_db;
    }
  
    # Get the site information, if present
    if ($site_info)
    {
       my %this_site = ();
  
       if (defined(${$site_info}{'name'}))      { $this_site{'name'}      = ${$site_info}{'name'}[0];      }
       if (defined(${$site_info}{'latitude'}))  { $this_site{'latitude'}  = ${$site_info}{'latitude'}[0];  }
       if (defined(${$site_info}{'longitude'})) { $this_site{'longitude'} = ${$site_info}{'longitude'}[0]; }
       if (defined(${$site_info}{'elevation'})) { $this_site{'elevation'} = ${$site_info}{'elevation'}[0]; }

       $config{'site'} = \%this_site;
    }

    # Return the config hash
    return %config;
}
########################################################################################
sub recreate_sensorML
{
    my ($data, $sensor) = @_;

    # If "no_sml" flag is set, return
    if ((defined($SOS::Main::no_sml)) && ($SOS::Main::no_sml)) { return; }

    # Check if a sensor hash exists and is not empty. If so, continue. If not, display error message
    if (!$sensor) { error(E_NOSENSOR, __FILE__, __LINE__); }

    # In order to ensure everything hangs together correctly, set the sensor file and sensor ID in the sensor hash
    # to the procedure file and procedure ID respectively.
    ${$sensor}{'sensor_file'} = ${$data}{'procedure_file'};
    ${$sensor}{'sensor_id'}   = ${$data}{'procedure_id'};

    if    ((defined($SOS::Main::force_sml)) && ($SOS::Main::force_sml)) { create_sensor_xml(${$data}{'db'}{'conn'}, $sensor); }
    elsif ((!defined($SOS::Main::dry_run))  ||  (!$SOS::Main::dry_run)) { create_sensor_xml(${$data}{'db'}{'conn'}, $sensor); }
}
########################################################################################
sub create_sensor_xml # Creates a sensor XML file
{
    my ($conn, $sref) = @_;
    my %sensor = %$sref;

    # Check template exists and then create new HTML::Template object
    my $template = $sensor{'template'};
    if (!defined($sensor{'template'})) { error(E_UNSPECTEMP,   __FILE__, __LINE__); }
    if (! -e $sensor{'template'})      { error(E_FILENOTEXIST, __FILE__, __LINE__, "Template", $template); }
    my $sensor_xml = HTML::Template->new(filename => $sensor{'template'});

    # Check required variables exist in the hash
    if (!defined($sensor{'sensor_id'}))   { error(E_NOSENELEMENT, __FILE__, __LINE__,   "sensor ID"); }
    if (!defined($sensor{'site'}))        { error(E_NOSENELEMENT, __FILE__, __LINE__,        "site"); }
    if (!defined($sensor{'components'}))  { error(E_NOSENELEMENT, __FILE__, __LINE__,  "components"); }
    if (!defined($sensor{'sensor_file'})) { error(E_NOSENELEMENT, __FILE__, __LINE__, "sensor file"); }

    # Print intro message
    print_message(MSG_NEWSML, $sensor{'sensor_file'}); 

    # Initialise parameter hash
    my %params = ();

    # Add sensor ID to parameter hash
    $params{'sensor_id'} = $sensor{'sensor_id'};

    # Add site information to parameter hash
    $params{'site_id'}        = (defined($sensor{'site'}{'id'})) ? $sensor{'site'}{'id'} : $sensor{'site'}{'name'};;
    $params{'site_latitude'}  = $sensor{'site'}{'lat'};
    $params{'site_longitude'} = $sensor{'site'}{'lon'};
    $params{'site_elevation'} = (defined($sensor{'site'}{'elevation'})) ? $sensor{'site'}{'elevation'} : 0;

    # Get the list of offerings for this procedure
    my $offerings = get_offering_list($conn, $sensor{'sensor_id'});

    # Create a phenomena hash
    my %phenomena = ();

    # For each offering, get the phenomena associated with it
    foreach my $this_offering (@$offerings)
    {
       # Get the offering name
       my $offer_name = get_offering_name($conn, $this_offering);

       # Create an offering hash
       my %offer_hash = ("offer_id" => $this_offering, "offer_name" => $offer_name);

       # Find the phenomena
       my $phen_list = get_phenomena_list($conn, $this_offering);

       # For each phenomena, get the name and the unit
       foreach my $this_phenom (@$phen_list)
       {
          my $phen_name = get_phenomenon_name($conn, $this_phenom);
          my $phen_unit = get_phenomenon_unit($conn, $this_phenom);
           
          # If no element for this phenomenon exists in the main phenomena hash, create it
          if (!defined($phenomena{$phen_name}))
          {
             my %phen_hash = ("id" => $this_phenom, "unit" => $phen_unit, "offerings" => []);
             $phenomena{$phen_name} = \%phen_hash;
          }

          # Add this offering to this phenomena hash
          push(@{$phenomena{$phen_name}{'offerings'}}, \%offer_hash);
       } 
    }
#    print Dumper(%phenomena);

    # Add phenomena info to the parameter hash
    my @input_list  = ();
    my @output_list = ();
    while (my($phen_name, $phen_info) = each(%phenomena))
    {
       my %this_input  = ("input_name"  => $phen_name, "input_def"  => ${$phen_info}{'id'});
       my %this_output = ("output_name" => $phen_name, "output_def" => ${$phen_info}{'id'}, "uom" => ${$phen_info}{'unit'}, 
                          "output_offerings" => ${$phen_info}{'offerings'});

       push(@input_list,   \%this_input);
       push(@output_list, \%this_output);
    }
    $params{'input_list'}  =  \@input_list;
    $params{'output_list'} = \@output_list;

    # Find information on components, then add them to the sensor hash
    # hardcoded for now during testing
    my @comp_list   = ();
    my $proc_phenom = get_phenomena_for_procedure($conn, $sensor{'sensor_id'});
    while (my ($k, $v) = each(%{$sensor{'components'}}))
    {
       my %this_comp = ();
       my (@this_in, @this_out, @sensor_list) = ((), (), ());

       $this_comp{'comp_name'} = $k;
       $this_comp{'comp_val'}  = sprintf("%s:%s", SENSOR_ROOT, $k);
       foreach my $sens_phenom (@{${$v}{'phenomena'}})
       {
          if (in_array(phenomenon_id($sens_phenom), $proc_phenom))
          {
             my %input  = ("input_name"  => $sens_phenom, "input_def"  => $phenomena{$sens_phenom}{'id'});
             my %output = ("output_name" => $sens_phenom, "output_def" => $phenomena{$sens_phenom}{'id'}, "uom" => $phenomena{$sens_phenom}{'unit'});

             push(@this_in,   \%input);
             push(@this_out, \%output);
          }
       }

       if (scalar(@this_in) > 0) 
       {
          while (my($keyword, $value) = each(%{${$v}{'keyword'}}))
          {
             my %this_info = ("sensor_keyword" => $keyword, "sensor_value" => $value);
             push(@sensor_list, \%this_info);
          }
       }

       $this_comp{"comp_input_list"}  = \@this_in;       
       $this_comp{"comp_output_list"} = \@this_out;
       $this_comp{"sensor_list"}      = \@sensor_list;       
       push(@comp_list, \%this_comp);
    }
    $params{'component_list'} = \@comp_list;

    # Fill in the parameters in the template
    while (my($key, $val) = each(%params)) { $sensor_xml->param($key => $val); }

    # Open the output file
    open(OUTPUT, ">", $sensor{'sensor_file'}) or error(E_NOFILEWRITE, __FILE__, __LINE__, $sensor{'sensor_file'});

    # Print output
    print OUTPUT $sensor_xml->output;

    # Close the output file
    close(OUTPUT);

    # Print completion message
    print_message(MSG_SMLCOMPLETE, $sensor{'sensor_file'});
}
########################################################################################
# SUBROUTINES TO CHECK IF ELEMENTS EXIST AND TO CREATE QUERIES
########################################################################################
sub insert_item # Creates an insert query
{
    my ($conn, $info, $table) = @_;

    # Create a query using the keys and values of the info hash
    my $foi_proj = 4326;
    my (@cols, @vals, @bind) = ((),(),());
    while(my($column, $value) = each(%$info))
    {
       my $this_bind;
       if ($column eq "geom") { $this_bind = sprintf("ST_GeometryFromText(?, %s)", $foi_proj); }
       else                   { $this_bind = "?";                                              }

       push(@cols,    $column);
       push(@vals,     $value);
       push(@bind, $this_bind);
    }

    # Create the query
    my $sql = sprintf("INSERT INTO %s (%s) VALUES(%s)", $table, join(",", @cols), join(",", @bind));

    # Run the query
    run_query($conn, $sql, \@vals, 0);    
#    # Return the query and the values
#    return ($sql, \@vals);
}
########################################################################################
sub item_exist # Checks if item exists in a given table/column
{
    my ($conn, $table, $column, $value) = @_;
    my $num = 0;

    my $sql  = "SELECT COUNT(*) FROM $table WHERE $column = ?";
    my @vars = ($value);

    my $get_info = run_query($conn, $sql, \@vars);
    while (my @row = $get_info->fetchrow_array()) { ($num) = @row; }

    return $num;     
}
########################################################################################
sub link_exist # Checks if item exists in link table
{
    my ($conn, $table, $col1, $col2, $item1, $item2) = @_;
    my $num = 0;

    my $sql  = "SELECT COUNT(*) FROM $table WHERE $col1 = ? AND $col2 = ?";
    my @vars = ($item1, $item2);

    my $get_info = run_query($conn, $sql, \@vars);
    while (my @row = $get_info->fetchrow_array()) { ($num) = @row; }

    return $num;
}
########################################################################################
sub obs_exist # Checks if observation exists
{
    my (%data) = @_;

    my $value_col = $data{'value_col'};
    my $sql       = "SELECT $value_col FROM observation WHERE time_stamp = ? AND phenomenon_id = ? AND offering_id = ?";
    my @vars      = ($data{'obs_time'}, $data{'phenomenon_id'}, $data{'offering_id'}); 

    my $retval;
    my $get_info = run_query($data{'db'}{'conn'}, $sql, \@vars);
    while (my @row = $get_info->fetchrow_array()) { ($retval) = @row; }

    return defined($retval);
}
########################################################################################
# SUBROUTINES TO CONVERT VALUES TO IDS AND VICE VERSA
########################################################################################
sub phenomenon_id # Creates a phenomenon ID
{ 
   my ($phenom) = @_;
   if (!$phenom) { warning(E_IDFAIL, __FILE__, __LINE__, "phenomenon_id", "phenomenon"); }

   return sprintf("%s:%s", PHENOM_ROOT, $phenom); 
}
########################################################################################
sub procedure_id # Creates a procedure ID
{ 
   my ($proc) = @_;
   if (!$proc) { warning(E_IDFAIL, __FILE__, __LINE__, "procedure_id", "procedure"); }

   return sprintf("%s:%s", PROC_ROOT, $proc); 
}
########################################################################################
sub get_name_from_id # Gets a name from an ID
{
    my ($id) = @_;
    if (!$id) { warning(E_NAMEFAIL, __FILE__, __LINE__, "phenomenon", "phenomenon_id"); }

    my @idparts = split(":", $id);
    return $idparts[-1];
}
########################################################################################
# SUBROUTINES TO ADD NEW ITEMS TO THE DATABASE
########################################################################################
sub add_phenomenon # Checks if phenomenon exists, and prepares a query if it doesn't
{
    my ($data) = @_;

    # Get phenomenon ID, unit and value type
    my $phen_id    = ${$data}{'phenomenon_id'};
    my $phen_name  = ${$data}{'phenomenon'};
    my $unit       = ${$data}{'unit'};
    my $value_type = ${$data}{'value_type'};

    # Check if phenomenon exists. If not, create the query
    my $new = 0;
    if (!item_exist(${$data}{'db'}{'conn'}, "phenomenon", "phenomenon_id", $phen_id))
    {
       print_message(MSG_NEWITEM, "phenomenon", $phen_id);   

       my %info = ( "phenomenon_id"          => $phen_id,
                    "phenomenon_description" => $phen_name,
                    "unit"                   => $unit,
                    "valuetype"              => $value_type 
                  );

       insert_item(${$data}{'db'}{'conn'}, \%info, "phenomenon");
       $new = 1;
    }

    return $new;
}
########################################################################################
sub add_offering # Checks if offering exists, and prepares a query if it doesn't
{   
    my ($data) = @_;
    
    # Get offering ID and name
    my $offer_id   = ${$data}{'offering_id'};
    my $offer_name = ${$data}{'offering'};
    
    # Check if offering exists. If not, create the query
    my $new = 0;
    if (!item_exist(${$data}{'db'}{'conn'}, "offering", "offering_id", $offer_id))
    {
       print_message(MSG_NEWITEM, "offering", $offer_id);   

       my %info = ( "offering_id"   => $offer_id,
                    "offering_name" => $offer_name
                  );

       insert_item(${$data}{'db'}{'conn'}, \%info, "offering");
       $new = 1;
    }

    return $new;
} 
########################################################################################
sub add_foi # Checks if feature of interest exists in the DB and prepares queries if not
{
    my ($data) = @_;
    my $foi = ${$data}{'foi'};
    
    # Check required values are in the FOI hash. If not, display error
    if ((!defined(${$foi}{'name'})) && (!defined(${$foi}{'id'}))) { error(E_NOFOIELEMENT, __FILE__, __LINE__, "name or ID"); }

    # Get feature of interest ID 
    my $foi_id   = ${$foi}{'id'};

    # Check if feature of interest exists. If not, create the query
    my $new = 0;
    if (!item_exist(${$data}{'db'}{'conn'}, "feature_of_interest", "feature_of_interest_id", $foi_id))
    {
       # Check required values are in the FOI hash. If not, display error
       if (!defined(${$foi}{'latitude'}))  { error(E_NOFOIELEMENT, __FILE__, __LINE__,   "latitude"); }
       if (!defined(${$foi}{'longitude'})) { error(E_NOFOIELEMENT, __FILE__, __LINE__,  "longitude"); }

       # Get required information from FOI hash
       my $foi_name = ${$foi}{'name'}; 
       my $lat      = ${$foi}{'latitude'};
       my $lon      = ${$foi}{'longitude'};

       print_message(MSG_NEWITEM, "feature of interest", $foi_id);   

       my %info = ( "feature_of_interest_id"          => $foi_id,
                    "feature_of_interest_name"        => $foi_name,
                    "feature_of_interest_description" => $foi_name,
                    "geom"                            => "POINT($lon $lat)",
                    "feature_type"                    => FOI_TYPE,
                    "schema_link"                     => FOI_SCHEMA
                  );

       insert_item(${$data}{'db'}{'conn'}, \%info, "feature_of_interest");
       $new = 1;
    }

    return $new;
}
########################################################################################
sub add_procedure # Checks if procedure exists in the DB and prepares queries if not
{
    my ($data) = @_;

    # Get procedure ID and file
    my $proc_id   = ${$data}{'procedure_id'};
    my $proc_file = ${$data}{'procedure_file'}; 

    # Check if procedure exits. If not, create the query
    my $new = 0;
    if (!item_exist(${$data}{'db'}{'conn'}, "procedure", "procedure_id", $proc_id))
    {
       print_message(MSG_NEWITEM, "procedure", $proc_id);   

       my %info = ( "procedure_id"     => $proc_id,
                    "description_url"  => sprintf("%s/%s", PROC_DIR, basename($proc_file)),
                    "description_type" => PROC_TYPE
                  );

       insert_item(${$data}{'db'}{'conn'}, \%info, "procedure");
       $new = 1;
    }

    return $new;
}
########################################################################################
sub add_observation # Creates the observation query
{
    my ($data) = @_;
    
    # Create info hash
    my %info = ( "time_stamp"             => ${$data}{'obs_time'},
                 "procedure_id"           => ${$data}{'procedure_id'},
                 "feature_of_interest_id" => ${$data}{'foi'}{'id'},
                 "phenomenon_id"          => ${$data}{'phenomenon_id'},
                 "offering_id"            => ${$data}{'offering_id'},
                 ${$data}{'value_col'}    => ${$data}{'value'}
               ); 

    # Create query and values
    insert_item(${$data}{'db'}{'conn'}, \%info, "observation");
}
########################################################################################
sub check_links # Checks links between phenomena, procedure, offering and feature of interest
{
    my ($data) = @_;

    # Check link between phenomena and offering
    check_individual_link(${$data}{'db'}{'conn'}, "phen_off", "phenomenon_id", "offering_id", ${$data}{'phenomenon_id'}, ${$data}{'offering_id'});    

    # Check link between procedure and phenomena
    check_individual_link(${$data}{'db'}{'conn'}, "proc_phen", "procedure_id", "phenomenon_id", ${$data}{'procedure_id'}, ${$data}{'phenomenon_id'});

    # Check link between feature of interest and offering
    check_individual_link(${$data}{'db'}{'conn'}, "foi_off", "feature_of_interest_id", "offering_id", ${$data}{'foi'}{'id'}, ${$data}{'offering_id'});

    # Check link between procedure and feature of interest
    check_individual_link(${$data}{'db'}{'conn'}, "proc_foi", "procedure_id", "feature_of_interest_id", ${$data}{'procedure_id'}, ${$data}{'foi'}{'id'});

    # Check link between procedure and offering
    check_individual_link(${$data}{'db'}{'conn'}, "proc_off", "procedure_id", "offering_id", ${$data}{'procedure_id'}, ${$data}{'offering_id'});
}
########################################################################################
sub check_individual_link # Checks individual link
{
    my ($conn, $link_table, $idcol1, $idcol2, $idval1, $idval2) = @_;

    my($ins_sql, $vars) = ("", []);
    if (!link_exist($conn, $link_table, $idcol1, $idcol2, $idval1, $idval2))
    {
       # Set up info hash
       my %info = ($idcol1 => $idval1,
                   $idcol2 => $idval2
                  );

       # Create the query and add it to the hash
       insert_item($conn, \%info, $link_table);
    }
}
########################################################################################
# SUBROUTINES WHICH RUN PRE-MADE QUERIES
########################################################################################
sub get_offering_list # Gets a list of offerings from a given procedure ID
{
    my ($conn, $proc_id) = @_;
    my @offerings = ();

    my $sql  = "SELECT offering_id FROM proc_off WHERE procedure_id = ?";
    my @vars = ($proc_id);
    my $get_info = run_query($conn, $sql, \@vars);
    while (my @row = $get_info->fetchrow_array()) { push(@offerings, $row[0]); }

    return \@offerings;
}
########################################################################################
sub get_offering_name # Returns the name of an offering, given an offering ID
{
    my ($conn, $offering_id) = @_;
    my $offering_name = "";

    my $sql  = "SELECT offering_name FROM offering WHERE offering_id = ?";
    my @vars = ($offering_id);
    my $get_info = run_query($conn, $sql, \@vars);
    while (my @row = $get_info->fetchrow_array()) { ($offering_name) = @row; }

    return $offering_name;
}
########################################################################################
sub get_phenomena_list # Gets a list of phenomena from a given offering ID
{
    my ($conn, $offering_id) = @_;
    my @phenomena     = ();

    my $sql  = "SELECT phenomenon_id FROM phen_off WHERE offering_id = ?";
    my @vars = ($offering_id);
    my $get_info = run_query($conn, $sql, \@vars);
    while (my @row = $get_info->fetchrow_array()) { push(@phenomena, $row[0]); }

    return \@phenomena;
}
########################################################################################
sub get_phenomena_for_procedure # Gets a list of phenomena from a given procedure ID
{
    my ($conn, $procedure_id) = @_;
    my @phenomena     = ();

    my $sql  = "SELECT phenomenon_id FROM proc_phen WHERE procedure_id = ?";
    my @vars = ($procedure_id);
    my $get_info = run_query($conn, $sql, \@vars);
    while (my @row = $get_info->fetchrow_array()) { push(@phenomena, $row[0]); }

    return \@phenomena;
}
########################################################################################
sub get_phenomenon_name # Returns the unit of a given phenomenon
{
    my ($conn, $phenom_id) = @_;
    my $phen_name   = "";

    my $sql  = "SELECT phenomenon_description FROM phenomenon WHERE phenomenon_id = ?";
    my @vars = ($phenom_id);
    my $get_info = run_query($conn, $sql, \@vars);
    while (my @row = $get_info->fetchrow_array()) { ($phen_name) = @row; }

    return $phen_name;
}
########################################################################################
sub get_phenomenon_unit # Returns the unit of a given phenomenon
{
    my ($conn, $phenom_id) = @_;
    my $unit        = "";
    
    my $sql  = "SELECT unit FROM phenomenon WHERE phenomenon_id = ?";
    my @vars = ($phenom_id);
    my $get_info = run_query($conn, $sql, \@vars);
    while (my @row = $get_info->fetchrow_array()) { ($unit) = @row; }

    return $unit;
}
########################################################################################
# OTHER SUBROUTINES
########################################################################################
sub in_array # Checks to see if element is in array
{
    my ($thing, $aref) = @_;
    my @array = (defined($aref)) ? @$aref : ();

    foreach my $element (@array)
    {
       if ($thing eq $element) { return 1; }
    }

    return 0;
}
########################################################################################
END { };
1;
########################################################################################
# DOCUMENTATION
########################################################################################

=head1 NAME

SOS::Main - Function library containing all of the core SOS functions.

=head1 SYNOPSIS

use SOS::Main;

=head1 SUBROUTINES

=head2 update_sos(I<data_object>, I<sensor_object>)

Updates the database with a single observation. The information about the observation is in the I<data_object> which is a Perl hash.
See the L</"DATA OBJECT FORMAT"> and L</"SENSOR OBJECT FORMAT"> sections for information on these objects. I<data_object> and I<sensor_object>
should be passed as references.

=head2 decode_file(I<data_file>, I<config_file>, I<db_object>, I<dry_run>, I<verbose>, I<force_sml>)

Decodes I<data_file>, using the configuration in I<config_file>, and inserts the information into the database. This is used mainly in 
the B<obs_from_file.pl> script. For more information on this subroutine, check the man page that script.

=head2 create_sensor_xml(I<db_handle>, I<sensor_object>)

Recreates the sensor ML file. I<db_handle> is a handle to an open connection to a SOS database in which contains the information necessary to
create the sensor ML file. See the L</"SENSOR OBJECT FORMAT"> section for information about I<sensor_object>. This subroutine will output the
sensor ML file to the same directory as the script that calls it. In order for it to be used by SOS, you will have to place this file in the 
correct location on the SOS server.

=head2 parse_config_file(I<config_file>)

Parses a I<config_file> and returns a config hash. I<config_file> should be one that contains information about the data file format.

=head2 phenomenon_id(I<phenomenon_name>)

Converts I<phenomenon_name> to a phenomenon ID and returns it.

=head2 procedure_id(I<procedure_name>)

Converts I<procedure_name> to a procedure ID and returns it.

=head1 VARIABLES

=head2 verbose

The value of the "verbose" flag. If set to 1, verbose output messages will be printed. Otherwise, the script will run quietly.

=head2 dry_run

The value of the "dry_run" flag. If set to 1, the script will run as normal, but will rollback the database transaction at the end (as opposed to
committing changes).

=head2 force_sml

The value of the "force_sml" flag. If set to 1, the script will force an update of the sensor ML file.

=head1 CONSTANTS

=head2 PHENOM_ROOT

The root of the "phenomenon ID". Set to "urn:ogc:def:phenomenon:OGC:1.0.30".

=head2 PROC_ROOT

The root of the "procedure ID". Set to "urn:ogc:object:feature:Sensor:BAS".

=head2 FOI_PROJ

The EPSG projection used for feature of interest. Set to 4326.

=head2 FOI_TYPE

The "feature_type" in the feature_of_interest table. Set to "sa:SamplingPoint";

=head2 FOI_SCHEMA

The "schema_link" in the feature_of_interest table. Set to "http://xyz.org/reference-url2.html".

=head2 PROC_DIR

The directory containing the proc file on the SOS server. Set to "standard".

=head2 PROC_TYPE

The "description_type" in the procedure table. Set to "text/xml;subtype=\"SensorML/1.0.1\"";

=head2 SENSOR_ROOT

The root of the "sensor ID". Set to "urn:ogc:object:feature:Sensor".

=head2 DEFAULT_COL_DELIM

The default column delimiter in a file. Set to ",".

=head2 SENSOR_TEMPLATE

The default sensor template file. Set to "SOS/sensor.template"
 
=head1 DATA OBJECT FORMAT

The data object contains all the information about a single observation. It uses the following elements:

=head2 db

This is a hash containing database connection information. This hash must contain either B<conn> (an already opened database handle) 
or B<type> (usually Pg for Postgres), B<host> (the hostname of the machine running the database instance), B<name> (the database name), 
B<user> (the database user) and B<pass> (the password). If any required elements are missing, an error will be generated.

=head2 procedure, procedure_id

This contains the name of the procedure. Ideally, it should match the name of the sensor ML file containing the information about this
sensor, but without the ".xml" extension. At least one of B<procedure> or B<procedure_id> can be specified, and if only one is present, the 
script will determine the missing one using default settings. 

=head2 offering, offering_id

This contains the name of the offering to which this observation belongs. At least one of B<offering> or B<offering_id> can be specified, and 
if only one is present, the script will determine the missing one using default settings. 

=head2 foi
 
This is a hash containing feature of interest information. Usually, a feature of interest is the site at which the observation was made. This 
has must contain B<name> or B<id> (the name or ID of the site), B<latitude> (the latitude of the site, in degrees where North is positive) and
B<longitude> (the longitude of the site, in degrees where East is positive). If any of these elements are missing, an error will be generated.

=head2 phenomenon, phenomenon_id

This contains the name of the phenomenon or observed property. At least one of B<phenomenon> or B<phenomenon_id> can be specified, and if only 
one is present, the script will determine the missing one using default settings.

=head2 timestamp, obs_time

This contains the date and time at which the observation was recorded. This date and time should be in UTC. B<timestamp> expects the date and time
to be in UNIX timestamp format (i.e. seconds since 1970-01-01) and B<obs_time> expects the date and time to be in the format SOS expects, (i.e. in 
%Y-%m-%D %H:%M:%S format). Only one of these needs to be specified. If B<timestamp> is specified, the subroutine will automatically convert it into 
the B<obs_time> format.

=head2 unit

The unit of measurement for this observation.

=head2 value_type

The type of value for this observation. Allowed values are B<numericType> and B<textType>. Any other value will cause an error.

=head2 value_col

The SOS column of the value. For text values, this should be B<text_value>. For numeric values, this is B<numeric_value>. Any other value will cause an error.

=head2 verbose

Value to set the SOS::Main::verbose value to.

=head2 dry_run

Value to set the SOS::Main::dry_run value to.

=head2 force_sml

Value to set the SOS::Main::force_sml value to.

=head1 SENSOR OBJECT FORMAT

The sensor object contains all the information about the sensors used. This object is used primarily to create the sensor ML file. It uses the 
following elements:

=head2 sensor_id

The ID of the sensor. This is usually the name of the sensor ML file, without the ".xml" extension. If this is not specified, an error will occur.

=head2 sensor_file

The name of the sensor ML file.

=head2 site

The site at which this sensor is located. See the B<foi> element in the L</"DATA OBJECT FORMAT"> for more. If this is not specified, an error will
occur.

=head2 components

This is a hash containing information about the individual sensors. For each component element, the index is the ID of the component and the value is
another hash containing two elements: B<keyword> and B<phenomena>. B<keyword> is a hash of keyword/value pairs containing additional information about
the components. B<phenomena> is an array of the phenomena which are measured by this sensor. An example of the contents of B<components> is shown below:

'propvane' => {
              'keyword' => {
                              'longName' => 'propvane'
                           },
              'phenomena' => [
                               'wind_speed_prop_vane',
                               'wind_dir_prop_vane',
                               'max_wind_speed_prop_vane'
                             ]
              }

In this example, the ID of this particular component is "propvane".  

=head2 template

The template file to be used. This template should be suitable for use with the HTML::Template module. If this is not specified, or the specified file 
does not exist, then an error will be generated.

=head1 AUTHOR

PSD Admin, E<lt>psdadmin@psddata.nerc-bas.ac.ukE<gt>

=head1 COPYRIGHT AND LICENSE

Copyright (C) 2013 by PSD Admin

This library is free software; you can redistribute it and/or modify
it under the same terms as Perl itself, either Perl version 5.8.6 or,
at your option, any later version of Perl 5 you may have available.

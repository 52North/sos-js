#!/usr/bin/env Rscript

###############################################################################
# Project: MetDB
# Purpose: Produce plots for the given parameters from an SOS
# Author:  Paul M. Breen
# Date:    2012-11-08
# Id:      $Id$
###############################################################################

library(sos4R);

###############################################################################
# Defines
###############################################################################
SOS_URL <- "http://pdcdev:8080/52nSOSv3.5.0/sos";
SOS_UOM_UNHANDLED_TYPES <- list("mbar"=sosConvertDouble);
SOS_METADATA_UOM_TEXT <- "unit of measurement";
SOS_PHEN_URNS <- list(wind_speed="urn:ogc:def:phenomenon:OGC:1.0.30:wind_speed", wind_direction="urn:ogc:def:phenomenon:OGC:1.0.30:wind_direction");
SYNOP_TIME_LIMITS <- list(start="00:00:00", end="23:00:00");
COMPASS_POINTS <- c("N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW");
WIND_DIR_LIMITS <- list(start=0, end=360);
WIND_SPEED_STRIDE <- 5;
PLOT_SIZE <- list(width=800, height=600);
PLOT_OMA <- c(0,0.3,0,0);

###############################################################################
# Function to get an observed property (aka phenomenon) from an offering
#
# Pre-condition:  The offering object & the required observed property ID are
#                 passed to the function.  The ID can be the full URN or just
#                 the property name
# Post-condition: The observed property object for the given ID & offering
#                 is returned, or NULL on failure to match
###############################################################################
get_observed_property <- function(off, propertyID)
{
  exact_match <- TRUE;
  observedProperty <- NULL;

  # Look for an exact or partial match within this offering's observed
  # properties.  That is, urn:ogc:def:phenomenon:OGC:1.0.30:wind_direction will
  # match itself, or just wind_direction

  if(length(m <- grep(":", propertyID)) < 1) exact_match <- FALSE;

  for(prop in sosObservedProperties(off))
  {
    if(exact_match) name <- prop else name <- sub("^.*:", "", prop);

    if(name == propertyID)
    {
      observedProperty <- prop;
      break;
    }
  }

  return(observedProperty);
}



###############################################################################
# Function to translate a variable name suitable for display
#
# Pre-condition:  The name is passed to the function
# Post-condition: Underscores are replaced with spaces & the words are
#                 formatted as title-case (uppercase first char)
###############################################################################
to_display_name <- function(name)
{
  # Split words on underscores & capitalise first char of each word
  s <- strsplit(name, "_")[[1]];
  paste(toupper(substring(s, 1, 1)), substring(s, 2), sep="", collapse=" ");
}



###############################################################################
# Function to translate a unit of measure suitable for display
#
# Pre-condition:  The uom is passed to the function
# Post-condition: Certain uoms are reformatted.  If no reformat rule is found
#                 for the given uom, then it is returned as-is
###############################################################################
to_display_uom <- function(uom)
{
  # SOS units are encoded according to Unified Code for Units of Measure
  # (UCUM).  See http://unitsofmeasure.org/
  switch(uom,
    Cel = bquote(paste(degree, "C")),
    "m/s" = bquote(paste("m ", s^{-1})),
    uom
  );
}



###############################################################################
# Function to get observation data from an SOS
#
# Pre-condition:  An object containing the program's configuration parameters
#                 is passed to the function
# Post-condition: The required data are queried from the given SOS & packaged
#                 up along with other supporting query objects, metadata etc.
#                 If the query was for wind data, then both wind components
#                 (speed & direction) are returned in the wind object
###############################################################################
get_data <- function(config)
{
  # We package up all the SOS objects
  sos <- list();

  # The SOS library doesn't know how to handle the following units, so we have
  # to explicitly tell it.  Note: the function call sosDataFieldConverters(sos)
  # will list all units handled by the library
  sos$conv <- do.call(SosDataFieldConvertingFunctions, SOS_UOM_UNHANDLED_TYPES);

  # Instantiate an SOS object
  sos$sos <- SOS(url=config$sosURL, dataFieldConverters=sos$conv);

  if(is.null(sos$sos)) stop(config$sosURL, ": No such SOS");

  # Get a particular offering from those offered by this SOS
  sos$off <- sosOfferings(sos$sos)[[config$offeringID]];

  if(is.null(sos$off)) stop(config$offeringID, ": No such offering");

  # Get a particular observed property (aka phenomenon) from this offering
  sos$observedProperty <- get_observed_property(sos$off, config$propertyID);

  if(is.null(sos$observedProperty)) stop(config$propertyID, ": No such property");

  # Get observations of this phenomenon, using the specified temporal filter
  sos$tfilter <- sprintf("%d-01-01T%s::%d-12-31T%s", config$year, SYNOP_TIME_LIMITS$start, config$year, SYNOP_TIME_LIMITS$end);

  sos$obs <- getObservation(sos=sos$sos, offering=sos$off, observedProperty=as.list(sos$observedProperty), eventTime=sosCreateTime(sos=sos$sos, time=sos$tfilter));

  # Store some observed property metadata for convenience
  sos$observedProperty.name <- names(sosResult(sos$obs))[[2]];
  sos$observedProperty.uom <- attr(sosResult(sos$obs)[[2]], SOS_METADATA_UOM_TEXT);

  # A request for any wind component implies wind speed & wind direction
  if(sos$observedProperty.name == "wind_speed" || sos$observedProperty.name == "wind_direction")
  {
    sos$wind <- get_wind_data(config, sos);
  }

  return(sos);
}



###############################################################################
# Function to get wind data (speed & direction)
#
# Pre-condition:  An object containing the program's configuration parameters,
#                 & the queried SOS data object are passed to the function
# Post-condition: The wind data are queried from the given SOS, packaged up &
#                 returned.  The returned object contains the full wind data
#                 as a data.frame, & the wind direction frequencies classified
#                 by speed intervals as a data.frame
###############################################################################
get_wind_data <- function(config, sos)
{
  # We package up all the wind data
  wind <- list();

  # Get the wind component that we don't already have
  if(sos$observedProperty.name == "wind_speed")
    obs.ws <- sos$obs
  else
    obs.ws <- getObservation(sos=sos$sos, offering=sos$off, observedProperty=as.list(SOS_PHEN_URNS$wind_speed), eventTime=sosCreateTime(sos=sos$sos, time=sos$tfilter));

  if(sos$observedProperty.name == "wind_direction")
    obs.wd <- sos$obs
  else
    obs.wd <- getObservation(sos=sos$sos, offering=sos$off, observedProperty=as.list(SOS_PHEN_URNS$wind_direction), eventTime=sosCreateTime(sos=sos$sos, time=sos$tfilter));

  obs.ws.result <- sosResult(obs.ws);
  obs.wd.result <- sosResult(obs.wd);

  # Construct a data frame containing all wind components
  wind$data <- data.frame(cbind(time=obs.ws.result$SamplingTime, ws=obs.ws.result$wind_speed, wd=obs.wd.result$wind_direction));

  i <- 0;
  ws.limit <- ceiling(max(wind$data$ws));
  breaks <- seq(WIND_DIR_LIMITS$start, WIND_DIR_LIMITS$end, by=((WIND_DIR_LIMITS$end - WIND_DIR_LIMITS$start) / length(COMPASS_POINTS)));
  row.names <- NULL;
  rows <- NULL;

  # Construct a data frame containing histograms of wind data
  while(i < ws.limit)
  {
    j <- i + WIND_SPEED_STRIDE;
    hist.wd <- hist(wind$data$wd[wind$data$ws >= i & wind$data$ws < j], breaks=breaks, plot=F);
    if(j > ws.limit) row.name <- paste(">", i) else row.name <- paste(i, "-", j);
    row.names <- c(row.names, row.name);
    rows <- rbind(rows, hist.wd$counts);
    i <- j;
  }
  colnames(rows) <- COMPASS_POINTS;
  wind$freq <- data.frame(rows, row.names=row.names);

  return(wind);
} 



###############################################################################
# Function to produce the plots
#
# Pre-condition:  An object containing the program's configuration parameters,
#                 & the queried SOS data object are passed to the function
# Post-condition: A series of plots are produced from the given data & written
#                 to the output directory specified in the configuration
###############################################################################
produce_plots <- function(config, sos)
{
  plot_no <- 0;

  # Produce the yearly plots
  config$out_file <- sprintf("%s/%s_%s_%d_%d.png", config$out_dir, config$offeringID, sos$observedProperty.name, config$year, plot_no);
  plot_no <- plot_no + 1;
  produce_year_plots(config, sos);

  # Produce the monthly plots
  config$out_file <- sprintf("%s/%s_%s_%d_%d.png", config$out_dir, config$offeringID, sos$observedProperty.name, config$year, plot_no);
  plot_no <- plot_no + 1;
  produce_month_plots(config, sos);

  # A request for any wind component implies wind speed & wind direction
  if(sos$observedProperty.name == "wind_speed" || sos$observedProperty.name == "wind_direction")
  {
    config$out_file <- sprintf("%s/%s_%s_%d_%d.png", config$out_dir, config$offeringID, sos$observedProperty.name, config$year, plot_no);
    plot_no <- plot_no + 1;
    produce_wind_plots(config, sos);
  }
}
 


###############################################################################
# Function to produce the year plots
#
# Pre-condition:  An object containing the program's configuration parameters,
#                 & the queried SOS data object are passed to the function
# Post-condition: A year plot is produced from the given data & written
#                 to the output directory specified in the configuration
###############################################################################
produce_year_plots <- function(config, sos)
{
  # Get the observations as a data frame
  obs.result <- sosResult(sos$obs);

  # Get observation metadata suitable for display
  observedProperty.displayName <- to_display_name(sos$observedProperty.name);
  observedProperty.displayUom <- to_display_uom(sos$observedProperty.uom);

  # Create a factor on months
  f <- factor(as.POSIXlt(obs.result$SamplingTime)$mon+1);

  # Setup the plot device
  png(file=config$out_file, width=PLOT_SIZE$width, height=PLOT_SIZE$height);
  par(mfrow=c(2,1), oma=PLOT_OMA);

  main <- paste(sosName(sos$off), observedProperty.displayName, config$year);
  ylab <- bquote(paste(.(observedProperty.displayName), " / ", .(observedProperty.displayUom)));

  # Plot the time series
  plot(obs.result, type="l", xlab="", ylab=as.expression(ylab), main=main);

  # Add a smoothed general trend
  lines(supsmu(obs.result[[1]], obs.result[[2]]), col="red");

  months <- month.abb[seq(levels(f)[1], levels(f)[length(levels(f))])];

  # Plot some monthly stats
  boxplot(obs.result[[2]] ~ f, names=months, ylab=as.expression(ylab));

  dev.off();
}



###############################################################################
# Function to produce the month plots
#
# Pre-condition:  An object containing the program's configuration parameters,
#                 & the queried SOS data object are passed to the function
# Post-condition: A month plot is produced from the given data & written
#                 to the output directory specified in the configuration
###############################################################################
produce_month_plots <- function(config, sos)
{
  # Get the observations as a data frame
  obs.result <- sosResult(sos$obs);

  # Get observation metadata suitable for display
  observedProperty.displayName <- to_display_name(sos$observedProperty.name);
  observedProperty.displayUom <- to_display_uom(sos$observedProperty.uom);

  # Create a factor on months
  f <- factor(as.POSIXlt(obs.result$SamplingTime)$mon+1);

  # Setup the plot device
  nmonths <- length(levels(f));
  png(file=config$out_file, width=PLOT_SIZE$width, height=((PLOT_SIZE$height / 2) * nmonths));
  par(mfrow=c(nmonths,1), oma=PLOT_OMA);

  ylab <- bquote(paste(.(observedProperty.displayName), " / ", .(observedProperty.displayUom)));

  # Plot the time series for each month
  for(month in as.integer(levels(f)))
  {
    main <- paste(sosName(sos$off), observedProperty.displayName, month.abb[month], config$year);

    plot(obs.result[[1]][as.POSIXlt(obs.result$SamplingTime)$mon+1 == month], obs.result[[2]][as.POSIXlt(obs.result$SamplingTime)$mon+1 == month], type="l", xlab="", ylab=as.expression(ylab), main=main);

    # Add a smoothed general trend
    lines(supsmu(obs.result[[1]][as.POSIXlt(obs.result$SamplingTime)$mon+1 == month], obs.result[[2]][as.POSIXlt(obs.result$SamplingTime)$mon+1 == month]), col="red");
  }

  dev.off();
}



###############################################################################
# Function to produce the wind plots
#
# Pre-condition:  An object containing the program's configuration parameters,
#                 & the queried SOS data object are passed to the function
# Post-condition: A wind plot is produced from the given data & written
#                 to the output directory specified in the configuration
###############################################################################
produce_wind_plots <- function(config, sos)
{
  library(openair);               # Provides windRose()

  # Setup the plot device
  png(file=config$out_file, width=PLOT_SIZE$width, height=PLOT_SIZE$height);
  par(mfrow=c(1,1));

  main <- paste(sosName(sos$off), "Wind", config$year);

  ws.limit <- ceiling(max(sos$wind$data$ws));
  windRose(sos$wind$data, breaks=(ws.limit / WIND_SPEED_STRIDE), ws.int=WIND_SPEED_STRIDE, main=main);

  dev.off();
}



###############################################################################
# Main function
###############################################################################

# Validate input.  Ensure we have at least the minimum required arguments
args <- commandArgs(trailingOnly=T);

if(length(args) < 4)
{
  message("Usage: synop_plots.R /path/to/output/dir offeringID propertyID year");
  q(save="no", status=-1);
}

# We package up all the configuration parameters
config <- list();

config$out_dir <- args[1];
config$offeringID <- args[2];
config$propertyID <- args[3];
config$year <- as.integer(args[4]);

config$sosURL <- SOS_URL;

if(config$year < 1000) stop("year must be 4 digits");

# Get the requested data from the SOS
sos <- get_data(config);

# Output the plots
produce_plots(config, sos);

q(save="no", status=0);


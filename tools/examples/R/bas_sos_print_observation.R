#!/usr/bin/Rscript

library(sos4R);

# The SOS library doesn't know how to handle the following units, so we have
# to explicitly tell it.  Note: the function call sosDataFieldConverters(sos)
# will list all units handled by the library
conv <- SosDataFieldConvertingFunctions("mbar"=sosConvertDouble);

# Instantiate an SOS object
sos <- SOS(url='http://pdcdev:8080/52nSOSv3.5.0/sos', dataFieldConverters=conv);

# Get a particular offering from those offered by this SOS.  In this case, the
# HalleySynop offering
off <- sosOfferings(sos)[["HalleySynop"]];

# Get observation(s) of the observed property(s) within the given offering
obs <- getObservation(sos=sos, offering=off);

# Or equivalently this:
# obs <- getObservation(sos=sos, offering="HalleySynop");

# With the saveOriginal option, this call will write the observation result
# to an xml document in the current working directory.  See the manual
# /usr/lib/R/library/sos4R/doc/sos4R.pdf p. 26
# obs <- getObservation(sos=sos, offering=off, saveOriginal=T);

# N.B.: For the above function calls, we can be even more terse for the
#       mandatory arguments, by not using their names
# obs <- getObservation(sos, "HalleySynop");

# Interrogate the structure.  Useful for debugging
# str(obs);

# Get a particular observed property (also known as phenomenon) from this
# offering.  In this case, the air temperature
off.air_temperature <- sosObservedProperties(off)[[1]];

# Get observation(s) of the given observed property within the given offering
obs.air_temperature <- getObservation(sos=sos, off, observedProperty=as.list(off.air_temperature));

# Specify a temporal filter
# obs.air_temperature <- getObservation(sos=sos, off, observedProperty=as.list(off.air_temperature), eventTime=sosCreateTime(sos=sos, time="2012-09-01T00:00:00::2012-09-01T23:00:00"));

# str(obs.air_temperature);
# summary(obs.air_temperature);
# length(obs.air_temperature);
# obs.air_temperature[[1]];

obs.air_temperature.result <- sosResult(obs.air_temperature);

off.air_temperature;

obs.air_temperature.result;

# plot(obs.air_temperature.result, type="l");


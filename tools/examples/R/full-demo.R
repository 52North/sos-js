#!/usr/bin/Rscript

library(sos4R);

# Instantiate an SOS object
sos <- SOS(url = 'http://pdcdev:8080/52nSOSv3.5.0/sos');

# Get a particular offering from those offered by this SOS
off <- sosOfferings(sos)[["HalleySynop"]];

# Get a particular observed property (also known as phenomenon) from this
# offering
observedProperty <- sosObservedProperties(off)[[1]];

# Specify a temporal filter
obs <- getObservation(sos=sos, off, observedProperty=as.list(observedProperty), eventTime=sosCreateTime(sos=sos, time="2012-01-01T00:00:00::2012-12-31T23:00:00"));

# Get the specified data
obs.result <- sosResult(obs);

# Setup the plot device
png(file="full-demo.png", width=800, height=600);
par(mfrow=c(2,1));

year <- as.POSIXlt(obs.result$SamplingTime[[1]])$year+1900;
main <- paste("Halley Air Temperature", year);
ylab <- expression(paste("Temperature / ", degree, "C"));

# Plot the time series
plot(obs.result, type="l", xlab="", ylab=ylab);
title(main=main);

# Plot some monthly stats
f <- factor(as.POSIXlt(obs.result$SamplingTime)$mon+1);
boxplot(obs.result$air_temperature ~ f, names=month.abb[1:10], ylab=ylab);


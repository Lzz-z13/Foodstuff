import React from "react";
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
} from "react-native";

import { LineChart } from "react-native-gifted-charts";

const COLORS = {
  primary: "#FF6B2C",
  card: "#FFFFFF",
  textDark: "#1F2024",
  textGray: "#8B8D98",
  border: "#ECEDF0",
};

export default function WeeklyRevenueChart({ data }) {

  const { width } = useWindowDimensions();

  const chartWidth = Math.max(
    260,
    width - 76
  );

  return (
    <View style={styles.card}>

      <Text style={styles.title}>
        Faturamento Semanal
      </Text>

      <Text style={styles.subtitle}>
        Valores em reais
      </Text>

      <LineChart
        data={data}
        width={chartWidth}
        height={155}
        curved
        isAnimated
        color={COLORS.primary}
        thickness={3}
        spacing={chartWidth / 7}
        initialSpacing={8}
        endSpacing={8}
        dataPointsColor={COLORS.primary}
        dataPointsRadius={4}
        hideRules
        yAxisColor={COLORS.border}
        xAxisColor={COLORS.border}
        yAxisTextStyle={styles.axisText}
        xAxisLabelTextStyle={styles.axisText}
        noOfSections={4}
        maxValue={900}
        rulesColor="#F0F1F3"
      />

    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginTop: 12,
  },

  title: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.textDark,
  },

  subtitle: {
    fontSize: 10,
    color: COLORS.textGray,
    marginTop: 2,
    marginBottom: 8,
  },

  axisText: {
    fontSize: 9,
    color: COLORS.textGray,
  },
});
import pandas as pd
import numpy as np

# is the maximum number of samples acc() will average over, cannot be 0
acc_average_times = 5


# data class to help keep track of different types of data
class Data:
    def __init__(self, title, units, is_bool=False):
        self.title = title
        self.units = units
        self.is_bool = is_bool
        self.x = []  # x is usually time
        self.y = []  # y is the value of the data


# all the data that we want to keep track of
data = {
    'accm': Data("Acceleration Magnitude", "g"), 'accx': Data("Acceleration X", "g"),
    'accy': Data("Acceleration Y", "g"), 'accz': Data("Acceleration Z", "g"),
    'bat': Data("Battery Voltage", "V"), 'cool': Data("Coolant Temp", "F"),
    'eng_speed': Data("Engine Speed", "RPM"), 'egt': Data("Exhaust Gas Temp", "F"),
    'fan': Data("Fan on/off", "bool", is_bool=True), 'fuel_pres': Data("Fuel Pressure", "PSIg"),
    'fuel_pump': Data("Fuel Pump", "bool", is_bool=True), 'gear': Data("Gear", "Gear #"),
    'ign_time': Data("Ignition Timing", "Deg"), 'inj_duty': Data("Injector Duty Cycle", "%"),
    'iat': Data("Intake Air Temp", "F"), 'lambda': Data("Lambda", "Lambda"),
    'lambda_feed': Data("Lambda Feedback", "%"), 'lambda_targ': Data("Lambda Target", "Lambda"),
    'lpfr': Data("Lin Pot FR", "mm"), 'lpfl': Data("Lin Pot FL", "mm"),
    'lprr': Data("Lin Pot RR", "mm"), 'lprl': Data("Lin Pot RL", "mm"),
    'mass_air': Data("Mass Airflow", "gms/s"), 'map': Data("Manifold Absolute Pressure", "kPa"),
    'rpm_limit': Data("RPM Limit", "RPM"), 'rotx': Data("Rotation X", "deg/s"),
    'roty': Data("Rotation Y", "deg/s"), 'rotz': Data("Rotation Z", "deg/s"),
    'throt': Data("Throttle", "%"), 'flws': Data("FL Wheel Speed", "mph"),
    'frws': Data("FR Wheel Speed", "mph"), 'rlws': Data("RL Wheel Speed", "mph"),
    'rrws': Data("RR Wheel Speed", "mph"), 'vol_eff': Data("Volumetric Efficiency", "%"),
    'shift': Data("Shifter", "up/down", is_bool=True)
}

# data frame containing all data imported from files
data_df = None


def load(csv):
    load_data(csv)
    acc()
    can_01F0A000()
    can_01F0A003()
    can_01F0A004()
    can_01F0A005()
    can_01F0A006()
    can_01F0A008()
    can_01F0A011()
    load_lin_pots()
    load_egt()
    gyr()
    shf()


# read all file and store them in data_df
def load_data(file):
    global data_df
    '''
    another way to structure data_df: message type will become its own column instead of being the index column
    for file in filenames:
        df_list.append(pd.read_csv(filepath, index_col=False, names=["Message Type", "Time(ms)", "Data1", "Data2",
                                   "Data3"]))
    data_df = pd.concat(df_list, axis=0, ignore_index=True)
    '''
    data_df = pd.read_csv(file, index_col=0, names=["Message Type", "Time(ms)", "Data1", "Data2", "Data3"],
                          dtype=str)


# given an array of title string, returns an array of corresponding data objects
def title2data(titles):
    data_arr = []
    for title in titles:
        for key in data:
            if data[key].title == title:
                data_arr.append(data[key])
    return data_arr


# save data into csv
def save_data(file, data_selected):
    dictionary = {"time(ms)": [], "value(units)": []}
    for data_name in data_selected:
        data_type = title2data([data_name])[0]
        dictionary["time(ms)"].append("")
        dictionary["value(units)"].append("")
        dictionary["time(ms)"].append(data_type.title + " (" + data_type.units + ")")
        dictionary["value(units)"].append("")
        dictionary["time(ms)"].extend(data_type.x)
        dictionary["value(units)"].extend(data_type.y)
    pd.DataFrame(dictionary).to_csv(file, header=False, index=False)


'''
The following functions process data_df and store data in corresponding global Data variables
Some useful pandas functions:
data_df[str] returns the column with column name str
data_df.loc[str] returns rows whose index = str
data_df.loc[bool1 & bool2] returns rows that satisfy bool1 and bool2
'''


# inputs hex string, returns 8-bit signed int value of it
def hex_to_signed_int8(hexadecimal):
    int_val = int(hexadecimal, 16)
    if int_val >= 128:
        int_val -= 128
    return int_val


# receives a dataframe and a column name, returns a numpy array of the
# corresponding column in the dataframe in floats
# when there is only one value in the interested column, df[col_name]
# will return a string value as opposed to a Series
def df_to_float_numpy(df, col_name):
    col = df[col_name]
    if type(col) == str:
        return np.array([col], dtype=float)
    else:
        return col.to_numpy().astype(float)


# process can data with message id 01F0A000
def can_01F0A000():
    df = data_df.loc[(data_df.index == "CAN") & (data_df["Data2"] == "01F0A000")]

    time_stamps = df_to_float_numpy(df, "Time(ms)") / 1e6  # to make timestamps in seconds
    messages = df["Data3"].to_list()

    data['eng_speed'].x = data['throt'].x = data['iat'].x = data['cool'].x = time_stamps
    for msg in messages:
        data['eng_speed'].y.append(int(msg[0: 4], 16) * 0.39063)
        data['throt'].y.append(int(msg[8: 12], 16) * 0.0015259)
        data['iat'].y.append(9.0 / 5 * hex_to_signed_int8(msg[12: 14]) + 32)
        data['cool'].y.append(9.0 / 5 * hex_to_signed_int8(msg[14: 16]) + 32)


def can_01F0A003():
    df = data_df.loc[(data_df.index == "CAN") & (data_df["Data2"] == "01F0A003")]

    time_stamps = df_to_float_numpy(df, "Time(ms)") / 1e6
    messages = df["Data3"].to_list()

    data['lambda'].x = data['ign_time'].x = data['bat'].x = time_stamps
    for msg in messages:
        data['lambda'].y.append(int(msg[0: 2], 16) * 0.00390625 + 0.5)
        data['ign_time'].y.append(int(msg[10: 12], 16) * 0.35156 - 17)
        data['bat'].y.append(int(msg[12: 16], 16) * 0.0002455)

    # we don't want to show neutral in logs (it just adds confusion)
    for i in range(1, len(messages)):
        if int(messages[i][8: 10], 16) != 7:
            data['gear'].x.append(time_stamps[i])
            data['gear'].y.append(int(messages[i][8: 10], 16))


def can_01F0A004():
    df = data_df.loc[(data_df.index == "CAN") & (data_df["Data2"] == "01F0A004")]

    time_stamps = df_to_float_numpy(df, "Time(ms)") / 1e6
    messages = df["Data3"].to_list()

    data['map'].x = data['vol_eff'].x = data['fuel_pres'].x = data['lambda_targ'].x = data['fuel_pump'].x \
        = data['fan'].x = time_stamps
    for msg in messages:
        data['vol_eff'].y.append(int(msg[4: 6], 16))
        data['map'].y.append(int(msg[0: 4], 16) * 0.1)
        data['fuel_pres'].y.append(int(msg[6: 8], 16) * 0.580151)
        data['lambda_targ'].y.append(int(msg[10: 12], 16) * 0.00390625)
        # the [2:] removes the unnecessary '0b' from string, zfill(8) pads the string with leading zeros
        byte7_bin = bin(int(msg[12: 14], 16))[2:].zfill(8)
        data['fuel_pres'].y.append(int(byte7_bin[-1]))
        data['fan'].y.append(int(byte7_bin[-2]))


def can_01F0A005():
    df = data_df.loc[(data_df.index == "CAN") & (data_df["Data2"] == "01F0A005")]

    time_stamps = df_to_float_numpy(df, "Time(ms)") / 1e6
    messages = df["Data3"].to_list()

    data['mass_air'].x = time_stamps
    for msg in messages:
        # launch_ramp_time.y.append(int(msg[0: 4], 16) * 10)
        data['mass_air'].y.append(int(msg[4: 8], 16) * 0.05)


def can_01F0A006():
    df = data_df.loc[(data_df.index == "CAN") & (data_df["Data2"] == "01F0A006")]

    time_stamps = df_to_float_numpy(df, "Time(ms)") / 1e6
    messages = df["Data3"].to_list()

    data['inj_duty'].x = data['lambda_feed'].x = time_stamps
    for msg in messages:
        data['inj_duty'].y.append(int(msg[6: 10], 16) * 0.392157)
        data['lambda_feed'].y.append(int(msg[2:4], 16) * 0.5 - 64)


def can_01F0A008():
    df = data_df.loc[(data_df.index == "CAN") & (data_df["Data2"] == "01F0A008")]

    time_stamps = df_to_float_numpy(df, "Time(ms)") / 1e6
    messages = df["Data3"].to_list()

    data['rpm_limit'].x = time_stamps
    for msg in messages:
        data['rpm_limit'].y.append(int(msg[6: 10], 16) * 0.39063)


def can_01F0A011():
    df = data_df.loc[(data_df.index == "CAN") & (data_df["Data2"] == "01F0A011")]

    time_stamps = df_to_float_numpy(df, "Time(ms)") / 1e6
    messages = df["Data3"].to_list()

    data['flws'].x = time_stamps
    data['rlws'].x = time_stamps
    data['frws'].x = time_stamps
    data['rrws'].x = time_stamps
    for msg in messages:
        data['rlws'].y.append(int(msg[0:4], 16) * 0.02 / 1.609)
        data['rrws'].y.append(int(msg[4:8], 16) * 0.02 / 1.609)
        data['flws'].y.append(int(msg[8:12], 16) * 0.02 / 1.609)
        data['frws'].y.append(int(msg[12:16], 16) * 0.02 / 1.609)


def load_lin_pots():
    df_fr = data_df.loc[(data_df.index == "CAN") & (data_df["Data2"] == "0C001000")]
    df_fl = data_df.loc[(data_df.index == "CAN") & (data_df["Data2"] == "0C101000")]
    df_rl = data_df.loc[(data_df.index == "CAN") & (data_df["Data2"] == "0C201000")]
    df_rr = data_df.loc[(data_df.index == "CAN") & (data_df["Data2"] == "0C301000")]

    data['lpfr'].x = df_to_float_numpy(df_fr, "Time(ms)") / 1e6
    data['lpfl'].x = df_to_float_numpy(df_fl, "Time(ms)") / 1e6
    data['lprl'].x = df_to_float_numpy(df_rl, "Time(ms)") / 1e6
    data['lprr'].x = df_to_float_numpy(df_rr, "Time(ms)") / 1e6

    for msg in df_fr["Data3"].to_list():
        data['lpfr'].y.append(int(msg[0:4], 16) * 75./1023.)

    for msg in df_fl["Data3"].to_list():
        data['lpfl'].y.append(int(msg[0:4], 16) * 75./1023.)

    for msg in df_rl["Data3"].to_list():
        data['lprl'].y.append(int(msg[0:4], 16) * 75./1023.)

    for msg in df_rr["Data3"].to_list():
        data['lprr'].y.append(int(msg[0:4], 16) * 75./1023.)


def load_egt():
    df = data_df.loc[data_df.index == "EGT"]

    time_stamps = df_to_float_numpy(df, "Time(ms)") / 1e6
    messages = df_to_float_numpy(df, "Data1")

    data['egt'].x = time_stamps
    for msg in messages:
        data['egt'].y.append(msg * 9/5 + 32)


def acc():
    if "ACC" not in data_df.index:
        return

    df = data_df.loc[data_df.index == "ACC"]

    x_list = df_to_float_numpy(df, "Data1") / 1e6
    y_list = df_to_float_numpy(df, "Data2") / 1e6
    z_list = df_to_float_numpy(df, "Data3") / 1e6

    # calculate the averages of x, y, and z
    avg_times = min(acc_average_times, len(x_list))
    x_avg = np.sum(x_list[0: avg_times], axis=0) / avg_times
    y_avg = np.sum(y_list[0: avg_times], axis=0) / avg_times
    z_avg = np.sum(z_list[0: avg_times], axis=0) / avg_times

    data['accm'].x = data['accx'].x = data['accy'].x = data['accz'].x = df_to_float_numpy(df, "Time(ms)") / 1e6
    # subtract the average from x, y, z to filter out gravity
    data['accm'].y = list(np.sqrt(np.square(x_list - x_avg) + np.square(y_list - y_avg) + np.square(z_list - z_avg)))
    data['accx'].y = list(x_list - x_avg)
    data['accy'].y = list(y_list - y_avg)
    data['accz'].y = list(z_list - z_avg)


# process gyr data
def gyr():
    if "GYR" not in data_df.index:
        return

    df = data_df.loc[data_df.index == "GYR"]

    x_list = df_to_float_numpy(df, "Data1")
    y_list = df_to_float_numpy(df, "Data2")
    z_list = df_to_float_numpy(df, "Data3")

    data['rotx'].x = data['roty'].x = data['rotz'].x = df_to_float_numpy(df, "Time(ms)") / 1e6
    data['rotx'].y = x_list / 1e3
    data['roty'].y = y_list / 1e3
    data['rotz'].y = z_list / 1e3


def shf():
    df = data_df.loc[data_df.index == "SHF"]
    if df.empty:
        return

    df = df.replace('UPSHIFT', 1, regex=True)
    df = df.replace('DOWNSHIFT', -1, regex=True)

    time_stamps = df_to_float_numpy(df, "Time(ms)") / 1e6
    messages = df_to_float_numpy(df, "Data1")

    for i in range(0,len(time_stamps)):
        if(i > 1 and messages[i-1] != messages[i]):
            data['shift'].x.append(time_stamps[i] - 1/1e6)
            data['shift'].y.append(0)
        data['shift'].x.append(time_stamps[i])
        data['shift'].y.append(messages[i])
        if(i < len(time_stamps)-1 and messages[i] != messages[i+1]):
            data['shift'].x.append(time_stamps[i] + 1/1e6)
            data['shift'].y.append(0)
